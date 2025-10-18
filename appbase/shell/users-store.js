import { DEFAULT_LOCALE } from "./i18n.js";

const STORAGE_KEY = "appbase:shell:users";
const DATA_URL = "/appbase/data/users.db.json";
const subscribers = new Set();

let state = { users: [] };
let loadPromise = null;

function cloneDependent(item) {
  if (!item) {
    return null;
  }
  return {
    nome: typeof item.nome === "string" ? item.nome : "",
    telefoneHash: typeof item.telefoneHash === "string" ? item.telefoneHash : null,
  };
}

function cloneUser(user) {
  if (!user) {
    return null;
  }
  return {
    userId: user.userId,
    nome: user.nome,
    email: user.email,
    telefoneHash: user.telefoneHash,
    idiomaPreferido: user.idiomaPreferido,
    temaPreferido: user.temaPreferido,
    seguirSistema: user.seguirSistema,
    status: user.status,
    role: user.role,
    dependentes: Array.isArray(user.dependentes)
      ? user.dependentes.map((item) => cloneDependent(item)).filter(Boolean)
      : [],
  };
}

function sanitizeUser(input) {
  const dependentes = Array.isArray(input?.dependentes)
    ? input.dependentes
        .map((dep) => cloneDependent(dep))
        .filter((dep) => dep && dep.nome)
    : [];
  return {
    userId: String(input?.userId ?? ""),
    nome: typeof input?.nome === "string" ? input.nome : "",
    email: typeof input?.email === "string" ? input.email : "",
    telefoneHash: typeof input?.telefoneHash === "string" ? input.telefoneHash : null,
    idiomaPreferido: typeof input?.idiomaPreferido === "string" ? input.idiomaPreferido : DEFAULT_LOCALE,
    temaPreferido:
      input?.temaPreferido === "dark"
        ? "dark"
        : input?.temaPreferido === "light"
        ? "light"
        : null,
    seguirSistema: input?.seguirSistema !== false,
    status: typeof input?.status === "string" ? input.status : "pending",
    role: typeof input?.role === "string" ? input.role : "viewer",
    dependentes,
  };
}

function readFromStorage() {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users)) {
      return null;
    }
    return {
      users: parsed.users.map((user) => sanitizeUser(user)).filter((user) => user.userId),
    };
  } catch (error) {
    console.warn("users-store: falha ao ler dados persistidos.", error);
    return null;
  }
}

function writeToStorage(data) {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("users-store: não foi possível salvar dados.", error);
  }
}

async function fetchInitialData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`Resposta inválida ao carregar ${DATA_URL}`);
    }
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.users)) {
      return;
    }
    state = {
      users: payload.users.map((user) => sanitizeUser(user)).filter((user) => user.userId),
    };
  } catch (error) {
    console.warn("users-store: falha ao carregar dados iniciais.", error);
    state = { users: [] };
  }
}

function notifySubscribers() {
  const snapshot = state.users.map((user) => cloneUser(user)).filter(Boolean);
  subscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error("users-store: falha ao notificar inscrito.", error);
    }
  });
}

function persistState() {
  writeToStorage({ users: state.users });
}

async function ensureDataLoaded() {
  if (loadPromise) {
    return loadPromise;
  }
  loadPromise = (async () => {
    const stored = readFromStorage();
    if (stored) {
      state = stored;
      return;
    }
    await fetchInitialData();
    persistState();
  })();
  return loadPromise;
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function hashValue(value) {
  if (!value) {
    return null;
  }
  try {
    if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
      const encoder = new TextEncoder();
      const data = encoder.encode(String(value));
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch (error) {
    console.warn("users-store: falha ao calcular hash criptográfico, usando fallback.", error);
  }
  let hash = 0;
  const input = String(value);
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

async function prepareDependents(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const result = [];
  for (const item of list) {
    if (!item || typeof item.nome !== "string") {
      continue;
    }
    const nome = item.nome.trim();
    if (!nome) {
      continue;
    }
    const telefone = typeof item.telefone === "string" ? item.telefone.trim() : "";
    const telefoneHash = telefone ? await hashValue(telefone) : item.telefoneHash ?? null;
    result.push({
      nome,
      telefoneHash,
    });
  }
  return result;
}

async function buildUserPayload(input, baseUser = null) {
  const userId = baseUser?.userId ?? input?.userId ?? generateId();
  const telefone = typeof input?.telefone === "string" ? input.telefone.trim() : "";
  const telefoneHash = telefone
    ? await hashValue(telefone)
    : baseUser?.telefoneHash ?? input?.telefoneHash ?? null;
  const dependentes = await prepareDependents(input?.dependentes);
  return sanitizeUser({
    ...baseUser,
    ...input,
    userId,
    telefoneHash,
    dependentes,
  });
}

export async function listUsers() {
  await ensureDataLoaded();
  return state.users.map((user) => cloneUser(user)).filter(Boolean);
}

export function subscribeToUsers(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("subscribeToUsers requer uma função de callback.");
  }
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export async function createUser(input) {
  await ensureDataLoaded();
  const user = await buildUserPayload(input);
  state.users.push(user);
  persistState();
  notifySubscribers();
  return cloneUser(user);
}

export async function updateUser(userId, changes) {
  if (!userId) {
    throw new TypeError("updateUser requer um userId válido.");
  }
  await ensureDataLoaded();
  const index = state.users.findIndex((user) => user.userId === userId);
  if (index === -1) {
    throw new Error(`Usuário ${userId} não encontrado.`);
  }
  const current = state.users[index];
  const next = await buildUserPayload({ ...changes, userId }, current);
  state.users[index] = next;
  persistState();
  notifySubscribers();
  return cloneUser(next);
}

export async function deleteUser(userId) {
  if (!userId) {
    throw new TypeError("deleteUser requer um userId válido.");
  }
  await ensureDataLoaded();
  const index = state.users.findIndex((user) => user.userId === userId);
  if (index === -1) {
    return false;
  }
  state.users.splice(index, 1);
  persistState();
  notifySubscribers();
  return true;
}

export function resetUsers(data) {
  state = {
    users: Array.isArray(data?.users)
      ? data.users.map((user) => sanitizeUser(user)).filter((user) => user.userId)
      : [],
  };
  persistState();
  notifySubscribers();
}
