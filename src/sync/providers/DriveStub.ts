import type { SyncProvider } from '../SyncProvider.js';

const STORAGE_KEY = 'sync:drive';

const resolveStorage = (): Storage | undefined => {
  try {
    return typeof globalThis !== 'undefined' ? (globalThis as { localStorage?: Storage }).localStorage : undefined;
  } catch (error) {
    return undefined;
  }
};

const generateRevision = (): string => `rev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface StoredPayload {
  rev: string;
  updatedAt: string;
  backup: unknown;
}

export class DriveStub implements SyncProvider {
  private readonly storage: Storage | undefined;

  constructor(storage: Storage | undefined = resolveStorage()) {
    this.storage = storage;
  }

  isConfigured(): boolean {
    return Boolean(this.storage);
  }

  async push(fullBackup: unknown): Promise<{ ok: boolean; rev?: string }> {
    if (!this.storage) return { ok: false };
    const rev = generateRevision();
    const payload: StoredPayload = { rev, updatedAt: new Date().toISOString(), backup: fullBackup };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true, rev };
  }

  async pull(): Promise<{ ok: boolean; backup?: unknown; rev?: string }> {
    if (!this.storage) return { ok: false };
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return { ok: true };
    try {
      const payload = JSON.parse(raw) as StoredPayload;
      return { ok: true, backup: payload.backup, rev: payload.rev };
    } catch (error) {
      console.warn('Falha ao ler backup do DriveStub, limpando…', error);
      this.storage.removeItem(STORAGE_KEY);
      return { ok: false };
    }
  }
}
