import init, {
  aes_gcm_encrypt as wasm_aes_gcm_encrypt,
  aes_gcm_decrypt as wasm_aes_gcm_decrypt,
  aes_ctr_encrypt as wasm_aes_ctr_encrypt,
  aes_ctr_decrypt as wasm_aes_ctr_decrypt,
  chacha20_poly1305_encrypt as wasm_chacha20_encrypt,
  chacha20_poly1305_decrypt as wasm_chacha20_decrypt,
  xchacha20_poly1305_encrypt as wasm_xchacha20_encrypt,
  xchacha20_poly1305_decrypt as wasm_xchacha20_decrypt,
  salsa20_poly1305_encrypt as wasm_salsa20_encrypt,
  salsa20_poly1305_decrypt as wasm_salsa20_decrypt,
  derive_key as wasm_derive_key,
  stream_encrypt as wasm_stream_encrypt,
  stream_decrypt as wasm_stream_decrypt,
} from './pkg/crypto_core.js';

let initialized = false;

export async function ensureInit(): Promise<void> {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

export function aes_gcm_encrypt(plaintext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_aes_gcm_encrypt(plaintext, key, nonce);
}

export function aes_gcm_decrypt(ciphertext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_aes_gcm_decrypt(ciphertext, key, nonce);
}

export function aes_ctr_encrypt(plaintext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_aes_ctr_encrypt(plaintext, key, nonce);
}

export function aes_ctr_decrypt(data: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_aes_ctr_decrypt(data, key, nonce);
}

export function chacha20_poly1305_encrypt(plaintext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_chacha20_encrypt(plaintext, key, nonce);
}

export function chacha20_poly1305_decrypt(ciphertext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_chacha20_decrypt(ciphertext, key, nonce);
}

export function xchacha20_poly1305_encrypt(plaintext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_xchacha20_encrypt(plaintext, key, nonce);
}

export function xchacha20_poly1305_decrypt(ciphertext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_xchacha20_decrypt(ciphertext, key, nonce);
}

export function salsa20_poly1305_encrypt(plaintext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_salsa20_encrypt(plaintext, key, nonce);
}

export function salsa20_poly1305_decrypt(ciphertext: Uint8Array, key: Uint8Array, nonce: Uint8Array): Uint8Array {
  return wasm_salsa20_decrypt(ciphertext, key, nonce);
}

export function derive_key(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  memorySizeKib: number,
  parallelism: number,
  outputLength: number,
): Uint8Array {
  return wasm_derive_key(password, salt, iterations, memorySizeKib, parallelism, outputLength);
}

export function stream_encrypt(
  data: Uint8Array,
  passphrase: string,
  argonIterations: number,
  argonMemoryKib: number,
  argonParallelism: number,
): Uint8Array {
  return wasm_stream_encrypt(data, passphrase, argonIterations, argonMemoryKib, argonParallelism);
}

export function stream_decrypt(
  encryptedData: Uint8Array,
  passphrase: string,
  argonIterations: number,
  argonMemoryKib: number,
  argonParallelism: number,
): Uint8Array {
  return wasm_stream_decrypt(encryptedData, passphrase, argonIterations, argonMemoryKib, argonParallelism);
}

export type {
  InitInput,
  InitOutput,
  SyncInitInput,
} from './pkg/crypto_core.js';
