const KEY = "appbase:user";
export const users = {
  getCurrent() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  },
  login(email) {
    const u = {
      email,
      ref: email.toLowerCase(),
      created_at: new Date().toISOString()
    };
    localStorage.setItem(KEY, JSON.stringify(u));
    return u;
  },
  logout() {
    localStorage.removeItem(KEY);
  },
  isLogged() {
    return !!users.getCurrent();
  }
};
