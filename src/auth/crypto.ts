let subtlePromise: Promise<SubtleCrypto> | null = null;

const resolveSubtle = (): Promise<SubtleCrypto> => {
  if (!subtlePromise) {
    subtlePromise = (async () => {
      if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.subtle) {
        return globalThis.crypto.subtle;
      }
      const nodeCrypto = await import('crypto');
      const webcrypto = (nodeCrypto as { webcrypto?: Crypto }).webcrypto;
      if (webcrypto?.subtle) {
        return webcrypto.subtle;
      }
      throw new Error('SubtleCrypto não disponível no ambiente atual.');
    })();
  }
  return subtlePromise;
};

const toHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let output = '';
  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0');
  }
  return output;
};

export async function sha256(text: string): Promise<string> {
  const subtle = await resolveSubtle();
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await subtle.digest('SHA-256', data);
  return toHex(digest);
}
