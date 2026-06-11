import { ensureInit, aes_gcm_encrypt, aes_gcm_decrypt, aes_ctr_encrypt, aes_ctr_decrypt, chacha20_poly1305_encrypt, chacha20_poly1305_decrypt, xchacha20_poly1305_encrypt, xchacha20_poly1305_decrypt, salsa20_poly1305_encrypt, salsa20_poly1305_decrypt } from '../crypto-core/index';

let inited = false;
async function initOnce() {
  if (!inited) { await ensureInit(); inited = true; }
}

export const aesGcm = {
  encrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return aes_gcm_encrypt(data, key, iv);
  },
  decrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return aes_gcm_decrypt(data, key, iv);
  },
};

export const aesCtr = {
  encrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return aes_ctr_encrypt(data, key, iv);
  },
  decrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return aes_ctr_decrypt(data, key, iv);
  },
};

export const chacha20Poly1305 = {
  encrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return chacha20_poly1305_encrypt(data, key, iv);
  },
  decrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return chacha20_poly1305_decrypt(data, key, iv);
  },
};

export const xChacha20Poly1305 = {
  encrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return xchacha20_poly1305_encrypt(data, key, iv);
  },
  decrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return xchacha20_poly1305_decrypt(data, key, iv);
  },
};

export const salsa20Poly1305 = {
  encrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return salsa20_poly1305_encrypt(data, key, iv);
  },
  decrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
    await initOnce();
    return salsa20_poly1305_decrypt(data, key, iv);
  },
};

export const IV_LENGTHS: Record<string, number> = {
  'AES-GCM': 12,
  'AES-CTR': 16,
  'ChaCha20-Poly1305': 12,
  'XChaCha20-Poly1305': 24,
  'Salsa20-Poly1305': 24
};
