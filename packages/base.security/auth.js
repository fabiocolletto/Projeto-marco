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

function normalizeRole(role) {
  return role === 'owner' ? 'owner' : 'member';
}

function generateId() {
  return `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function setSession(userId) {
  writeStore(SESSION_KEY, userId);
  notify();
}

function notify() {
  listeners.forEach(listener => listener(currentUser()));
}

export function listUsers() {
  return readStore(USERS_KEY, []);
}

export function currentUser() {
  const sessionId = readStore(SESSION_KEY, null);
  if (!sessionId) return null;
  return listUsers().find(user => user.id === sessionId) || null;
}

export function register({ name, email, password, role = 'member' }) {
  const users = listUsers();
  if (users.some(user => user.email === email)) {
    throw new Error('auth:user-exists');
  }
  const newUser = {
    id: generateId(),
    name,
    email,
    password,
    role: normalizeRole(role),
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeStore(USERS_KEY, users);
  setSession(newUser.id);
  return newUser;
}

export function login({ email, password }) {
  const users = listUsers();
  const user = users.find(candidate => candidate.email === email && candidate.password === password);
  if (!user) {
    throw new Error('auth:invalid-credentials');
  }
  setSession(user.id);
  return user;
}

export function logout() {
  writeStore(SESSION_KEY, null);
  notify();
}

export function switchUser(email) {
  const users = listUsers();
  const target = users.find(user => user.email === email);
  if (!target) {
    throw new Error('auth:user-not-found');
  }
  setSession(target.id);
  return target;
}

export function onAuthChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
