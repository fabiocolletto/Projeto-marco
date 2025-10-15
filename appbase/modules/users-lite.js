const STORAGE_KEY = "appbase:user";

export const users = {
  getCurrent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      console.warn("[users-lite] parse error", error);
      return null;
    }
  },
  login(email) {
    const normalized = String(email).trim();
    if (!normalized) return null;
    const user = {
      email: normalized,
      ref: normalized.toLowerCase(),
      created_at: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },
  logout() {
    localStorage.removeItem(STORAGE_KEY);
  },
  isLogged() {
    return !!users.getCurrent();
  }
};
