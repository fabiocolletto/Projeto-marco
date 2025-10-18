const STORAGE_KEY = 'appbase:deviceId';
const createWithCryptoRandomValues = (cryptoObj) => {
    if (typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
    }
    if (typeof cryptoObj.getRandomValues === 'function') {
        const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
        if (!(bytes instanceof Uint8Array)) {
            return '';
        }
        const sixth = bytes[6];
        const eighth = bytes[8];
        if (sixth === undefined || eighth === undefined) {
            return '';
        }
        // Adapted from RFC4122 section 4.4
        bytes[6] = (sixth & 0x0f) | 0x40;
        bytes[8] = (eighth & 0x3f) | 0x80;
        const segments = [
            bytes.subarray(0, 4),
            bytes.subarray(4, 6),
            bytes.subarray(6, 8),
            bytes.subarray(8, 10),
            bytes.subarray(10, 16),
        ];
        return segments
            .map((segment) => Array.from(segment, (byte) => byte.toString(16).padStart(2, '0')).join(''))
            .join('-');
    }
    return '';
};
const createFallbackId = () => {
    const time = Date.now().toString(16);
    const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
        .toString(16)
        .padStart(12, '0');
    return `${time}-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 12)}`;
};
const createDeviceId = () => {
    const cryptoObj = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
    if (cryptoObj) {
        const candidate = createWithCryptoRandomValues(cryptoObj);
        if (candidate)
            return candidate;
    }
    return createFallbackId();
};
const getStorage = () => {
    if (typeof globalThis.localStorage !== 'undefined') {
        return globalThis.localStorage;
    }
    return null;
};
export function getDeviceId() {
    const storage = getStorage();
    const existing = storage?.getItem(STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
        return existing;
    }
    const id = createDeviceId();
    storage?.setItem(STORAGE_KEY, id);
    return id;
}
//# sourceMappingURL=device.js.map