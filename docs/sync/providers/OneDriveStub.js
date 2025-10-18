const STORAGE_KEY = 'sync:onedrive';
const resolveStorage = () => {
    try {
        return typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined;
    }
    catch (error) {
        return undefined;
    }
};
const generateRevision = () => `rev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export class OneDriveStub {
    constructor(storage = resolveStorage()) {
        this.storage = storage;
    }
    isConfigured() {
        return Boolean(this.storage);
    }
    async push(fullBackup) {
        if (!this.storage)
            return { ok: false };
        const rev = generateRevision();
        const payload = { rev, updatedAt: new Date().toISOString(), backup: fullBackup };
        this.storage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return { ok: true, rev };
    }
    async pull() {
        if (!this.storage)
            return { ok: false };
        const raw = this.storage.getItem(STORAGE_KEY);
        if (!raw)
            return { ok: true };
        try {
            const payload = JSON.parse(raw);
            return { ok: true, backup: payload.backup, rev: payload.rev };
        }
        catch (error) {
            console.warn('Falha ao ler backup do OneDriveStub, limpando…', error);
            this.storage.removeItem(STORAGE_KEY);
            return { ok: false };
        }
    }
}
//# sourceMappingURL=OneDriveStub.js.map