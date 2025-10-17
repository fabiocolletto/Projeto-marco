const USERS_KEY = 'miniapp.base.users';
const SESSION_KEY = 'miniapp.base.session';
const listeners = new Set();

const storage = (() => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
})();

const sessionStorageRef = (() => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
})();

let volatileSessionId = null;

function derivePhoneRegion(phoneRegion, phone) {
  if (phoneRegion === 'INTL') return 'INTL';
  if (phoneRegion === 'BR') return 'BR';
  if (typeof phone === 'string' && phone.trim().startsWith('+55')) {
    return 'BR';
  }
  if (typeof phone === 'string' && phone.trim().startsWith('+')) {
    return 'INTL';
  }
  return 'BR';
}

function readStore(key, fallback) {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('auth: unable to parse storage', error);
    return fallback;
  }
}

function writeStore(key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('auth: unable to persist data', error);
  }
}

function removeStore(key) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn('auth: unable to remove data', error);
  }
}

function readSessionStore(key, fallback) {
  if (!sessionStorageRef) return fallback ?? volatileSessionId;
  try {
    const raw = sessionStorageRef.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('auth: unable to parse session storage', error);
    return fallback ?? volatileSessionId;
  }
}

function writeSessionStore(key, value) {
  if (!sessionStorageRef) {
    volatileSessionId = value ?? null;
    return;
  }
  try {
    if (value === undefined) {
      sessionStorageRef.removeItem(key);
    } else {
      sessionStorageRef.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('auth: unable to persist session data', error);
  }
}

function clearSessionStore() {
  writeSessionStore(SESSION_KEY, null);
}

function removeSessionStore(key) {
  if (!sessionStorageRef) {
    volatileSessionId = null;
    return;
  }
  try {
    sessionStorageRef.removeItem(key);
  } catch (error) {
    console.warn('auth: unable to remove session data', error);
  }
}

function getSessionId() {
  const persisted = readStore(SESSION_KEY, null);
  if (persisted) {
    return persisted;
  }
  const sessionValue = readSessionStore(SESSION_KEY, null);
  if (sessionValue) {
    return sessionValue;
  }
  return volatileSessionId;
}

function normalizeRole(role) {
  return role === 'owner' ? 'owner' : 'member';
}

function generateId() {
  return `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function setSession(userId, { remember = true } = {}) {
  if (remember) {
    writeStore(SESSION_KEY, userId);
    writeSessionStore(SESSION_KEY, null);
    volatileSessionId = null;
  } else {
    writeStore(SESSION_KEY, null);
    writeSessionStore(SESSION_KEY, userId);
    volatileSessionId = sessionStorageRef ? null : userId;
  }
  notify();
}

function notify() {
  listeners.forEach(listener => listener(currentUser()));
}

export function listUsers() {
  const users = readStore(USERS_KEY, []);
  if (!Array.isArray(users)) return [];
  return users.map(user => {
    if (!user || typeof user !== 'object') return user;
    const normalizedPhoneRegion = derivePhoneRegion(user.phoneRegion, user.phone);
    if (user.phoneRegion === normalizedPhoneRegion) {
      return user;
    }
    return {
      ...user,
      phoneRegion: normalizedPhoneRegion
    };
  });
}

function persistUsers(users) {
  writeStore(USERS_KEY, users);
}

export function currentUser() {
  const sessionId = getSessionId();
  if (!sessionId) return null;
  return listUsers().find(user => user.id === sessionId) || null;
}

export function register(
  { name, email, password, role = 'member', phone = '', phoneRegion = 'BR' },
  options = {}
) {
  const { autoLogin = true } = options;
  const users = listUsers();
  if (users.some(user => user.email === email)) {
    throw new Error('auth:user-exists');
  }
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'owner' && users.some(user => user.role === 'owner')) {
    throw new Error('auth:owner-exists');
  }
  const normalizedPhoneRegion = derivePhoneRegion(phoneRegion, phone);
  const newUser = {
    id: generateId(),
    name,
    email,
    password,
    role: normalizedRole,
    phone,
    phoneRegion: normalizedPhoneRegion,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  persistUsers(users);
  if (autoLogin) {
    setSession(newUser.id);
  } else {
    notify();
  }
  return newUser;
}

export function login({ email, password }, options = {}) {
  const { remember = true } = options;
  const users = listUsers();
  const user = users.find(candidate => candidate.email === email && candidate.password === password);
  if (!user) {
    throw new Error('auth:invalid-credentials');
  }
  setSession(user.id, { remember });
  return user;
}

export function logout() {
  writeStore(SESSION_KEY, null);
  clearSessionStore();
  volatileSessionId = null;
  notify();
}

export function updateUserProfile(id, { name, email, role }) {
  const users = listUsers();
  const index = users.findIndex(user => user.id === id);
  if (index === -1) {
    throw new Error('auth:user-not-found');
  }
  const nextEmail = email ?? users[index].email;
  if (nextEmail && users.some(user => user.email === nextEmail && user.id !== id)) {
    throw new Error('auth:user-exists');
  }
  const currentRole = users[index].role;
  const nextRole = normalizeRole(role ?? currentRole);
  if (nextRole === 'owner' && users.some(user => user.role === 'owner' && user.id !== id)) {
    throw new Error('auth:owner-exists');
  }
  if (currentRole === 'owner' && nextRole !== 'owner') {
    const otherOwnerExists = users.some(user => user.id !== id && user.role === 'owner');
    if (!otherOwnerExists) {
      throw new Error('auth:owner-required');
    }
  }
  const updated = {
    ...users[index],
    name: name ?? users[index].name,
    email: nextEmail,
    role: nextRole
  };
  users[index] = updated;
  persistUsers(users);
  notify();
  return updated;
}

export function changePassword(id, { currentPassword, newPassword }) {
  const users = listUsers();
  const index = users.findIndex(user => user.id === id);
  if (index === -1) {
    throw new Error('auth:user-not-found');
  }
  const user = users[index];
  if (user.password !== currentPassword) {
    throw new Error('auth:invalid-password');
  }
  users[index] = { ...user, password: newPassword };
  persistUsers(users);
  notify();
  return users[index];
}

export function deleteUser(id) {
  const users = listUsers();
  const index = users.findIndex(user => user.id === id);
  if (index === -1) {
    throw new Error('auth:user-not-found');
  }
  const isOwner = users[index].role === 'owner';
  if (isOwner) {
    throw new Error('auth:owner-delete-forbidden');
  }
  const [removed] = users.splice(index, 1);
  persistUsers(users);
  const sessionId = getSessionId();
  if (sessionId === id) {
    writeStore(SESSION_KEY, null);
    clearSessionStore();
    volatileSessionId = null;
  }
  notify();
  return removed;
}

export function setUserPassword(id, newPassword) {
  if (!newPassword) {
    throw new Error('auth:missing-password');
  }
  const users = listUsers();
  const index = users.findIndex(user => user.id === id);
  if (index === -1) {
    throw new Error('auth:user-not-found');
  }
  users[index] = { ...users[index], password: newPassword };
  persistUsers(users);
  notify();
  return users[index];
}

export function transferOwnership(targetId) {
  const users = listUsers();
  if (!users.length) {
    throw new Error('auth:user-not-found');
  }
  const currentOwnerIndex = users.findIndex(user => user.role === 'owner');
  if (currentOwnerIndex === -1) {
    throw new Error('auth:owner-required');
  }
  const targetIndex = users.findIndex(user => user.id === targetId);
  if (targetIndex === -1) {
    throw new Error('auth:user-not-found');
  }
  if (users[targetIndex].role === 'owner') {
    return users[targetIndex];
  }
  users[currentOwnerIndex] = {
    ...users[currentOwnerIndex],
    role: 'member'
  };
  users[targetIndex] = {
    ...users[targetIndex],
    role: 'owner'
  };
  persistUsers(users);
  notify();
  return users[targetIndex];
}

export function onAuthChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetAuth() {
  removeStore(USERS_KEY);
  removeStore(SESSION_KEY);
  removeSessionStore(SESSION_KEY);
  volatileSessionId = null;
  notify();
}
