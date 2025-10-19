import { DEFAULT_LOCALE } from "./i18n.js";
import {
  listUsers as listAuthUsers,
  register as registerUser,
  updateUserProfile,
  deleteUser as deleteAuthUser,
  onAuthChange,
} from "../../packages/base.security/auth.js";

const META_STORAGE_KEY = "miniapp.base.users.meta";
const LEGACY_STORAGE_KEY = "appbase:shell:users";
const USERS_STORAGE_KEY = "miniapp.base.users";

const STATUS_OPTIONS = new Set(["active", "pending", "suspended"]);
const ROLE_OPTIONS = new Set(["admin", "manager", "viewer"]);

const subscribers = new Set();
let metaState = loadMeta();
let notificationChain = Promise.resolve([]);

migrateLegacyUsers();
queueEmit();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (!event) {
      return;
    }
    if (event.key === META_STORAGE_KEY || event.key === USERS_STORAGE_KEY) {
      metaState = loadMeta();
      queueEmit();
    }
  });
}

onAuthChange(() => {
  queueEmit();
});

function loadMeta() {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, sanitizeMetaEntry(value)]),
      );
    }
  } catch (error) {
    console.warn("users-store: falha ao carregar metadados persistidos.", error);
  }
  return {};
}

function persistMeta() {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaState));
  } catch (error) {
    console.warn("users-store: não foi possível salvar metadados.", error);
  }
}

function normalizeStatus(value) {
  if (STATUS_OPTIONS.has(value)) {
    return value;
  }
  return "pending";
}

function normalizeRole(value) {
  if (ROLE_OPTIONS.has(value)) {
    return value;
  }
  return "viewer";
}

function normalizeThemePreference(value) {
  if (value === "dark" || value === "light") {
    return value;
  }
  return null;
}

function mapBaseRoleToUi(role) {
  return role === "owner" ? "admin" : "viewer";
}

function mapUiRoleToBase(role) {
  return role === "admin" ? "owner" : "member";
}

function sanitizeMetaEntry(entry) {
  const dependentes = Array.isArray(entry?.dependentes)
    ? entry.dependentes.map((item) => cloneDependent(item)).filter(Boolean)
    : [];
  const seguirSistema = entry?.seguirSistema !== false;
  const temaPreferido = seguirSistema ? null : normalizeThemePreference(entry?.temaPreferido);
  return {
    status: normalizeStatus(entry?.status),
    idiomaPreferido: typeof entry?.idiomaPreferido === "string" ? entry.idiomaPreferido : DEFAULT_LOCALE,
    temaPreferido,
    seguirSistema,
    dependentes,
    telefoneHash: typeof entry?.telefoneHash === "string" ? entry.telefoneHash : null,
    role: normalizeRole(entry?.role),
  };
}

function ensureMeta(userId) {
  if (!userId) {
    return null;
  }
  if (!metaState[userId]) {
    metaState[userId] = sanitizeMetaEntry({});
    persistMeta();
  }
  return metaState[userId];
}

function setMeta(userId, patch = {}) {
  if (!userId) {
    return null;
  }
  const current = ensureMeta(userId) ?? sanitizeMetaEntry({});
  const next = sanitizeMetaEntry({ ...current, ...patch });
  metaState[userId] = next;
  persistMeta();
  return next;
}

function pruneMetaForExistingUsers(baseUsers) {
  const validIds = new Set(baseUsers.map((user) => user.id));
  let changed = false;
  for (const userId of Object.keys(metaState)) {
    if (!validIds.has(userId)) {
      delete metaState[userId];
      changed = true;
    }
  }
  if (changed) {
    persistMeta();
  }
}

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
    ? input.dependentes.map((dep) => cloneDependent(dep)).filter(Boolean)
    : [];
  const seguirSistema = input?.seguirSistema !== false;
  const temaPreferido = seguirSistema ? null : normalizeThemePreference(input?.temaPreferido);
  return {
    userId: String(input?.userId ?? ""),
    nome: typeof input?.nome === "string" ? input.nome : "",
    email: typeof input?.email === "string" ? input.email : "",
    telefoneHash: typeof input?.telefoneHash === "string" ? input.telefoneHash : null,
    idiomaPreferido: typeof input?.idiomaPreferido === "string" ? input.idiomaPreferido : DEFAULT_LOCALE,
    temaPreferido,
    seguirSistema,
    status: normalizeStatus(input?.status),
    role: normalizeRole(input?.role),
    dependentes,
  };
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
    const telefoneHash = telefone
      ? await hashValue(telefone)
      : typeof item.telefoneHash === "string"
      ? item.telefoneHash
      : null;
    result.push({
      nome,
      telefoneHash,
    });
  }
  return result;
}

async function mapUser(baseUser) {
  if (!baseUser) {
    return null;
  }
  const meta = ensureMeta(baseUser.id);
  if (!meta) {
    return null;
  }
  const derivedRole = mapBaseRoleToUi(baseUser.role);
  if (!meta.role || (derivedRole === "admin" && meta.role !== "admin")) {
    meta.role = derivedRole;
    persistMeta();
  }
  let telefoneHash = meta.telefoneHash;
  if (!telefoneHash && baseUser.phone) {
    telefoneHash = await hashValue(baseUser.phone);
    if (telefoneHash) {
      meta.telefoneHash = telefoneHash;
      persistMeta();
    }
  }
  return sanitizeUser({
    userId: baseUser.id,
    nome: baseUser.name ?? "",
    email: baseUser.email ?? "",
    telefoneHash,
    idiomaPreferido: meta.idiomaPreferido,
    temaPreferido: meta.temaPreferido,
    seguirSistema: meta.seguirSistema,
    status: meta.status,
    role: meta.role,
    dependentes: meta.dependentes,
  });
}

async function collectUsersSnapshot() {
  const baseUsers = listAuthUsers();
  pruneMetaForExistingUsers(baseUsers);
  if (!Array.isArray(baseUsers) || !baseUsers.length) {
    return [];
  }
  const mapped = await Promise.all(baseUsers.map((user) => mapUser(user)));
  return mapped.filter(Boolean);
}

async function emitChange() {
  const snapshot = await collectUsersSnapshot();
  const clones = snapshot.map((user) => cloneUser(user)).filter(Boolean);
  subscribers.forEach((callback) => {
    try {
      callback(clones);
    } catch (error) {
      console.error("users-store: falha ao notificar inscrito.", error);
    }
  });
  return snapshot;
}

function queueEmit() {
  notificationChain = notificationChain
    .catch(() => [])
    .then(() => emitChange());
  return notificationChain;
}

function generateTemporaryPassword() {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
}

function migrateLegacyUsers() {
  if (typeof localStorage === "undefined") {
    return;
  }
  let raw = null;
  try {
    raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn("users-store: falha ao ler usuários legados.", error);
    return;
  }
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }
    const existing = listAuthUsers();
    if (existing.length) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }
    for (const entry of parsed.users) {
      try {
        const nome = typeof entry?.nome === "string" ? entry.nome : entry?.email ?? "";
        const email = typeof entry?.email === "string" ? entry.email : `${entry?.userId ?? "user"}@example.com`;
        const role = normalizeRole(entry?.role);
        const created = registerUser(
          {
            name: nome,
            email,
            password: generateTemporaryPassword(),
            role: mapUiRoleToBase(role),
            phone: "",
          },
          { autoLogin: false },
        );
        if (created && created.id) {
          const dependentes = Array.isArray(entry?.dependentes)
            ? entry.dependentes.map((item) => cloneDependent(item)).filter(Boolean)
            : [];
          setMeta(created.id, {
            status: entry?.status,
            idiomaPreferido: entry?.idiomaPreferido,
            temaPreferido: entry?.temaPreferido,
            seguirSistema: entry?.seguirSistema,
            dependentes,
            telefoneHash: entry?.telefoneHash,
            role,
          });
        }
      } catch (error) {
        console.warn("users-store: não foi possível migrar usuário legado.", error);
      }
    }
  } catch (error) {
    console.warn("users-store: formato inválido de usuários legados.", error);
  } finally {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.warn("users-store: falha ao limpar dados legados.", error);
    }
  }
}

export async function listUsers() {
  const snapshot = await collectUsersSnapshot();
  return snapshot.map((user) => cloneUser(user)).filter(Boolean);
}

export function subscribeToUsers(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("subscribeToUsers requer uma função de callback.");
  }
  subscribers.add(callback);
  listUsers()
    .then((users) => {
      try {
        callback(users.map((user) => cloneUser(user)).filter(Boolean));
      } catch (error) {
        console.error("users-store: falha ao enviar estado inicial.", error);
      }
    })
    .catch((error) => {
      console.error("users-store: falha ao carregar usuários ao inscrever.", error);
    });
  return () => {
    subscribers.delete(callback);
  };
}

export async function createUser(input) {
  const nome = typeof input?.nome === "string" ? input.nome.trim() : "";
  const email = typeof input?.email === "string" ? input.email.trim() : "";
  const telefone = typeof input?.telefone === "string" ? input.telefone.trim() : "";
  const role = normalizeRole(input?.role);
  const status = normalizeStatus(input?.status);
  const idiomaPreferido = typeof input?.idiomaPreferido === "string" ? input.idiomaPreferido : DEFAULT_LOCALE;
  const seguirSistema = input?.seguirSistema !== false;
  const temaPreferido = seguirSistema ? null : normalizeThemePreference(input?.temaPreferido);
  const dependentes = await prepareDependents(input?.dependentes);
  const telefoneHash = telefone ? await hashValue(telefone) : null;
  const created = registerUser(
    {
      name: nome || email,
      email,
      password: generateTemporaryPassword(),
      role: mapUiRoleToBase(role),
      phone: telefone,
    },
    { autoLogin: false },
  );
  setMeta(created.id, {
    status,
    idiomaPreferido,
    temaPreferido,
    seguirSistema,
    dependentes,
    telefoneHash,
    role,
  });
  const snapshot = await queueEmit();
  return snapshot.find((user) => user.userId === created.id) ?? null;
}

export async function updateUser(userId, changes) {
  if (!userId) {
    throw new TypeError("updateUser requer um userId válido.");
  }
  const baseUsers = listAuthUsers();
  const baseUser = baseUsers.find((user) => user.id === userId);
  if (!baseUser) {
    throw new Error(`Usuário ${userId} não encontrado.`);
  }
  const nome = typeof changes?.nome === "string" ? changes.nome.trim() : baseUser.name;
  const email = typeof changes?.email === "string" ? changes.email.trim() : baseUser.email;
  const telefone = typeof changes?.telefone === "string" ? changes.telefone.trim() : baseUser.phone ?? "";
  const role = normalizeRole(changes?.role ?? ensureMeta(userId)?.role);
  const status = normalizeStatus(changes?.status ?? ensureMeta(userId)?.status);
  const idiomaPreferido = typeof changes?.idiomaPreferido === "string"
    ? changes.idiomaPreferido
    : ensureMeta(userId)?.idiomaPreferido;
  const seguirSistema = changes?.seguirSistema !== undefined
    ? changes.seguirSistema !== false
    : ensureMeta(userId)?.seguirSistema !== false;
  const temaPreferido = seguirSistema
    ? null
    : normalizeThemePreference(
        changes?.temaPreferido ?? ensureMeta(userId)?.temaPreferido ?? null,
      );
  const dependentes = await prepareDependents(
    changes?.dependentes ?? ensureMeta(userId)?.dependentes ?? [],
  );
  const telefoneHash = telefone ? await hashValue(telefone) : ensureMeta(userId)?.telefoneHash ?? null;

  updateUserProfile(userId, {
    name: nome,
    email,
    role: mapUiRoleToBase(role),
    phone: telefone,
  });

  setMeta(userId, {
    status,
    idiomaPreferido,
    temaPreferido,
    seguirSistema,
    dependentes,
    telefoneHash,
    role,
  });

  const snapshot = await queueEmit();
  return snapshot.find((user) => user.userId === userId) ?? null;
}

export async function deleteUser(userId) {
  if (!userId) {
    throw new TypeError("deleteUser requer um userId válido.");
  }
  deleteAuthUser(userId);
  if (metaState[userId]) {
    delete metaState[userId];
    persistMeta();
  }
  await queueEmit();
  return true;
}

export async function resetUsers(data) {
  metaState = {};
  if (Array.isArray(data?.users)) {
    for (const entry of data.users) {
      if (!entry || !entry.userId) {
        continue;
      }
      metaState[entry.userId] = sanitizeMetaEntry(entry);
      metaState[entry.userId].telefoneHash =
        typeof entry.telefoneHash === "string" ? entry.telefoneHash : metaState[entry.userId].telefoneHash;
    }
    persistMeta();
  } else {
    persistMeta();
  }
  await queueEmit();
}
