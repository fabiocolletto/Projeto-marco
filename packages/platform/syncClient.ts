import { writable, type Writable } from 'svelte/store';

export type SyncProvider = 'google' | 'microsoft';

export interface SyncCredentials {
  phone: string;
  password: string;
  salt?: string;
  iterations?: number;
}

export interface SyncClientOptions {
  baseUrl?: string;
  apiPath?: string;
  graphqlPath?: string;
  fetch?: typeof fetch;
  deviceId?: string;
  iterations?: number;
}

export interface SyncState {
  mode: 'Desativado' | 'Standby' | 'Ativo' | 'Atualizando…' | 'Erro';
  detail: string;
  lastProvider?: SyncProvider | null;
  lastSyncedAt?: number | null;
  lastError?: string | null;
}

export interface PushSnapshotOptions {
  provider: SyncProvider;
  projectId: string;
  payload: unknown;
  updatedAt?: number;
}

export interface PullSnapshotOptions {
  provider: SyncProvider;
  projectId: string;
}

export interface ProviderTokenPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface DerivedKey {
  key: CryptoKey;
  salt: string;
  iterations: number;
}

interface SnapshotPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
}

interface SnapshotResponse {
  meta: {
    provider: SyncProvider;
    projectId: string;
    deviceId: string;
    hash: string;
    updatedAt: number;
    size: number;
  };
  payload: SnapshotPayload;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const globalAny = globalThis as typeof globalThis & { Buffer?: any };

function base64Encode(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    let string = '';
    for (const byte of bytes) {
      string += String.fromCharCode(byte);
    }
    return globalThis.btoa(string);
  }
  if (globalAny.Buffer) {
    return globalAny.Buffer.from(bytes).toString('base64');
  }
  throw new Error('Base64 encode indisponível no ambiente atual.');
}

function base64Decode(input: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (globalAny.Buffer) {
    const buf = globalAny.Buffer.from(input, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset ?? 0, buf.byteLength ?? buf.length);
  }
  throw new Error('Base64 decode indisponível no ambiente atual.');
}

function base64UrlEncode(bytes: Uint8Array): string {
  return base64Encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return base64Decode(padded);
}

function randomBytes(length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}

async function deriveKey(credentials: SyncCredentials, defaultIterations: number): Promise<DerivedKey> {
  const iterations = credentials.iterations ?? defaultIterations;
  const saltBytes = credentials.salt ? base64UrlDecode(credentials.salt) : randomBytes(16);
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${credentials.phone}:${credentials.password}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: saltBytes },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return { key, salt: base64UrlEncode(saltBytes), iterations };
}

async function encryptJson(payload: unknown, key: CryptoKey, iterations: number, salt: string): Promise<SnapshotPayload> {
  const iv = randomBytes(12);
  const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(json));
  return {
    ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
    iv: base64UrlEncode(iv),
    salt,
    iterations,
  };
}

async function decryptJson(snapshot: SnapshotPayload, key: CryptoKey): Promise<string> {
  const iv = base64UrlDecode(snapshot.iv);
  const ciphertext = base64UrlDecode(snapshot.ciphertext);
  const buffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return decoder.decode(new Uint8Array(buffer));
}

async function sha256(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return base64UrlEncode(new Uint8Array(hash));
}

function resolveDeviceId(custom?: string): string {
  if (custom) return custom;
  if (typeof window === 'undefined') {
    return `srv_${Math.random().toString(36).slice(2, 10)}`;
  }
  const key = 'ac:deviceId';
  try {
    const global = window.localStorage;
    let id = global.getItem(key);
    if (!id) {
      id = `dev_${Math.random().toString(36).slice(2, 10)}`;
      global.setItem(key, id);
    }
    return id;
  } catch {
    return `dev_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function createSyncClient(options: SyncClientOptions = {}) {
  const base = options.baseUrl ? options.baseUrl.replace(/\/$/, '') : '';
  const apiPath = options.apiPath ?? '/api';
  const graphqlPath = options.graphqlPath ?? '/graphql';
  const apiBase = `${base}${apiPath}`;
  const graphqlBase = `${base}${graphqlPath}`;
  const deviceId = resolveDeviceId(options.deviceId);
  const iterations = options.iterations ?? 310_000;
  const http = options.fetch ?? fetch.bind(globalThis);

  const status: Writable<SyncState> = writable({
    mode: 'Desativado',
    detail: 'Defina as credenciais para iniciar a sincronização.',
    lastProvider: null,
    lastSyncedAt: null,
    lastError: null,
  });

  let derived: DerivedKey | null = null;

  function ensureKey(): asserts derived is DerivedKey {
    if (!derived) {
      throw new Error('Credenciais de sincronização não configuradas.');
    }
  }

  async function setCredentials(credentials: SyncCredentials): Promise<void> {
    derived = await deriveKey(credentials, iterations);
    status.set({
      mode: 'Standby',
      detail: 'Credenciais prontas. Aguardando ação de sincronização.',
      lastProvider: null,
      lastSyncedAt: null,
      lastError: null,
    });
  }

  async function registerProvider(provider: SyncProvider, token: ProviderTokenPayload): Promise<void> {
    await http(`${apiBase}/providers/${provider}/token`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(token),
    });
    status.update((current) => ({
      ...current,
      detail: `Token do provedor ${provider} atualizado.`,
      lastError: null,
    }));
  }

  async function pushSnapshot(input: PushSnapshotOptions): Promise<void> {
    ensureKey();
    const json = typeof input.payload === 'string' ? input.payload : JSON.stringify(input.payload);
    const hash = await sha256(json);
    status.set({
      mode: 'Atualizando…',
      detail: `Enviando snapshot para ${input.provider}…`,
      lastProvider: input.provider,
      lastSyncedAt: Date.now(),
      lastError: null,
    });
    const payload = await encryptJson(json, derived.key, derived.iterations, derived.salt);
    const body = {
      provider: input.provider,
      projectId: input.projectId,
      deviceId,
      hash,
      updatedAt: input.updatedAt ?? Date.now(),
      payload,
    };
    const response = await http(`${apiBase}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const message = await response.text();
      status.set({
        mode: 'Erro',
        detail: 'Falha ao enviar snapshot.',
        lastProvider: input.provider,
        lastSyncedAt: Date.now(),
        lastError: message,
      });
      throw new Error(message);
    }
    status.set({
      mode: 'Ativo',
      detail: `Último envio concluído para ${input.provider}.`,
      lastProvider: input.provider,
      lastSyncedAt: Date.now(),
      lastError: null,
    });
  }

  async function pullSnapshot(input: PullSnapshotOptions): Promise<unknown> {
    ensureKey();
    status.set({
      mode: 'Atualizando…',
      detail: `Buscando snapshot em ${input.provider}…`,
      lastProvider: input.provider,
      lastSyncedAt: Date.now(),
      lastError: null,
    });
    const response = await http(`${apiBase}/snapshots/${input.provider}/${input.projectId}`);
    if (!response.ok) {
      const message = await response.text();
      status.set({
        mode: 'Erro',
        detail: 'Falha ao recuperar snapshot.',
        lastProvider: input.provider,
        lastSyncedAt: Date.now(),
        lastError: message,
      });
      throw new Error(message);
    }
    const data = (await response.json()) as SnapshotResponse;
    const plaintext = await decryptJson(data.payload, derived.key);
    status.set({
      mode: 'Ativo',
      detail: `Último download concluído de ${input.provider}.`,
      lastProvider: input.provider,
      lastSyncedAt: Date.now(),
      lastError: null,
    });
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  }

  async function listSnapshots(provider?: SyncProvider) {
    const query = `
      query ListSnapshots($provider: SyncProvider) {
        snapshots(provider: $provider) {
          id
          meta {
            provider
            projectId
            hash
            updatedAt
            size
            deviceId
          }
        }
      }
    `;
    const response = await http(graphqlBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { provider } }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const json = (await response.json()) as GraphQLResponse<{
      snapshots: { id: string; meta: SnapshotResponse['meta'] }[];
    }>;
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join('\n'));
    }
    return json.data?.snapshots ?? [];
  }

  return {
    status,
    setCredentials,
    registerProvider,
    pushSnapshot,
    pullSnapshot,
    listSnapshots,
  };
}
