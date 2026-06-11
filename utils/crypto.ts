import {
  encrypt as wasmEncrypt,
  decrypt as wasmDecrypt,
  encrypt_string as wasmEncryptString,
  decrypt_string as wasmDecryptString,
  encrypt_with_passphrase,
  decrypt_with_passphrase,
  base64_encode as b64enc,
  base64_decode as b64dec,
  derive_master_key,
  generate_vault_key,
} from '../crypto-core/index';
import { getVaultKey, setVaultKey } from './vaultKey';

export type { CryptoAlgorithm } from '../types';

function getKey(key?: Uint8Array): Uint8Array {
  if (key) return key;
  return getVaultKey();
}

const DEFAULT_ARGON = { iterations: 3, memoryKib: 65536, parallelism: 4 };

export const cryptoService = {
  setVaultKey(key: Uint8Array | null) {
    setVaultKey(key);
  },

  clearKeys() {
    setVaultKey(null);
  },

  generateVaultKey(): Uint8Array {
    return generate_vault_key();
  },

  async deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    return derive_master_key(password, salt, false);
  },

  base64ToArrayBuffer(b64: string): Uint8Array {
    return b64dec(b64);
  },

  arrayBufferToBase64(buf: Uint8Array): string {
    return b64enc(buf);
  },

  async encrypt(data: Uint8Array, key?: Uint8Array): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
    const k = getKey(key);
    const json = wasmEncrypt(data, k);
    const parsed = JSON.parse(json);
    return {
      ciphertext: b64dec(parsed.ciphertext),
      iv: b64dec(parsed.iv),
    };
  },

  async decrypt(data: Uint8Array, iv: Uint8Array, key?: Uint8Array): Promise<Uint8Array> {
    const k = getKey(key);
    return wasmDecrypt(b64enc(iv), b64enc(data), k);
  },

  async encryptString(data: string, key?: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
    const k = getKey(key);
    return JSON.parse(wasmEncryptString(data, k));
  },

  async decryptString(ciphertext: string, iv: string, key?: Uint8Array): Promise<string> {
    const k = getKey(key);
    return wasmDecryptString(ciphertext, iv, k);
  },

  async encryptWithPassphrase(
    data: Uint8Array,
    passphrase: string,
    algorithm: string,
    argonIterations?: number,
    argonMemoryKib?: number,
    argonParallelism?: number,
  ): Promise<{ ciphertext: Uint8Array; iv: Uint8Array; salt: Uint8Array; algorithm: string }> {
    const json = encrypt_with_passphrase(
      data, passphrase, algorithm,
      argonIterations ?? DEFAULT_ARGON.iterations,
      argonMemoryKib ?? DEFAULT_ARGON.memoryKib,
      argonParallelism ?? DEFAULT_ARGON.parallelism,
    );
    const parsed = JSON.parse(json);
    return {
      ciphertext: b64dec(parsed.ciphertext),
      iv: b64dec(parsed.iv),
      salt: b64dec(parsed.salt),
      algorithm: parsed.algorithm,
    };
  },

  async decryptWithPassphrase(
    data: Uint8Array,
    passphrase: string,
    iv: Uint8Array,
    salt: Uint8Array,
    algorithm: string,
    argonIterations?: number,
    argonMemoryKib?: number,
    argonParallelism?: number,
  ): Promise<Uint8Array> {
    return decrypt_with_passphrase(
      data, passphrase, iv, salt, algorithm,
      argonIterations ?? DEFAULT_ARGON.iterations,
      argonMemoryKib ?? DEFAULT_ARGON.memoryKib,
      argonParallelism ?? DEFAULT_ARGON.parallelism,
    );
  },
};
