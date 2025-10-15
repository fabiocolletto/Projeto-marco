const STORAGE_KEY = "appbase.v3.user";

const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("[users] erro ao ler usuário", error);
    return null;
  }
};

const write = (payload) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("[users] erro ao salvar usuário", error);
  }
};

export const users = {
  getCurrent() {
    return read();
  },
  login(email) {
    const trimmed = String(email || "").trim();
    if (!trimmed) {
      throw new Error("E-mail obrigatório");
    }
    const profile = {
      email: trimmed,
      ref: trimmed.toLowerCase(),
      created_at: new Date().toISOString(),
    };
    write(profile);
    return profile;
  },
  logout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("[users] erro ao remover usuário", error);
    }
  },
  isLogged() {
    return Boolean(read());
  },
};
