import { ensureInit, derive_key, aes_gcm_encrypt, aes_gcm_decrypt } from '../crypto-core/index';
import { aesGcm, aesCtr, chacha20Poly1305, xChacha20Poly1305, salsa20Poly1305, IV_LENGTHS } from './cryptoPrimitives';
import { streamCrypto } from './streamCrypto';
import { getArgonParams } from './platform';

export type CryptoAlgorithm = 'AES-GCM' | 'AES-CTR' | 'ChaCha20-Poly1305' | 'XChaCha20-Poly1305' | 'Salsa20-Poly1305' | 'AES-GCM-Stream';

export interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  algorithm: CryptoAlgorithm;
}

let inited = false;
async function initOnce() {
  if (!inited) { await ensureInit(); inited = true; }
}

class EncryptionService {
  private vaultKey: Uint8Array | null = null;

  async deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    await initOnce();
    const { iterations, memorySize, parallelism } = await getArgonParams();
    return derive_key(
      new TextEncoder().encode(password),
      salt,
      iterations,
      memorySize,
      parallelism,
      32,
    );
  }

  setVaultKey(key: Uint8Array) {
    this.vaultKey = key;
  }

  clearKeys() {
    this.vaultKey = null;
  }

  async generateVaultKey(): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  async encryptWithPassphrase(
    data: Blob | Uint8Array,
    passphrase: string,
    algorithm: CryptoAlgorithm
  ): Promise<EncryptedData> {
    const rawData = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const { iterations, memorySize, parallelism } = await getArgonParams();
    await initOnce();
    const key = derive_key(
      new TextEncoder().encode(passphrase),
      salt,
      iterations,
      memorySize,
      parallelism,
      32,
    );

    const ivLength = IV_LENGTHS[algorithm] || 12;
    const iv = crypto.getRandomValues(new Uint8Array(ivLength));

    let ciphertext: Uint8Array;

    switch (algorithm) {
      case 'AES-GCM':
        ciphertext = await aesGcm.encrypt(rawData, key, iv);
        break;
      case 'AES-CTR':
        ciphertext = await aesCtr.encrypt(rawData, key, iv);
        break;
      case 'ChaCha20-Poly1305':
        ciphertext = await chacha20Poly1305.encrypt(rawData, key, iv);
        break;
      case 'XChaCha20-Poly1305':
        ciphertext = await xChacha20Poly1305.encrypt(rawData, key, iv);
        break;
      case 'Salsa20-Poly1305':
        ciphertext = await salsa20Poly1305.encrypt(rawData, key, iv);
        break;
      default:
        throw new Error(`Algorithm ${algorithm} not supported.`);
    }

    return { ciphertext, iv, salt, algorithm };
  }

  async decryptWithPassphrase(
    encryptedData: Uint8Array,
    passphrase: string,
    iv: Uint8Array,
    salt: Uint8Array,
    algorithm: CryptoAlgorithm
  ): Promise<Uint8Array> {
    if (algorithm === 'AES-GCM-Stream') {
      return await streamCrypto.decrypt(encryptedData, passphrase);
    }

    const { iterations, memorySize, parallelism } = await getArgonParams();
    await initOnce();
    const key = derive_key(
      new TextEncoder().encode(passphrase),
      salt,
      iterations,
      memorySize,
      parallelism,
      32,
    );

    switch (algorithm) {
      case 'AES-GCM':
        return await aesGcm.decrypt(encryptedData, key, iv);
      case 'AES-CTR':
        return await aesCtr.decrypt(encryptedData, key, iv);
      case 'ChaCha20-Poly1305':
        return await chacha20Poly1305.decrypt(encryptedData, key, iv);
      case 'XChaCha20-Poly1305':
        return await xChacha20Poly1305.decrypt(encryptedData, key, iv);
      case 'Salsa20-Poly1305':
        return await salsa20Poly1305.decrypt(encryptedData, key, iv);
      default:
        throw new Error(`Algorithm ${algorithm} not supported.`);
    }
  }

  async encrypt(data: Blob | Uint8Array, key?: Uint8Array): Promise<EncryptedData> {
    const k = key || this.vaultKey;
    if (!k) throw new Error('Vault key not initialized');
    await initOnce();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const rawData = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
    const ciphertext = aes_gcm_encrypt(rawData, k, iv);
    return { ciphertext, iv, salt: new Uint8Array(0), algorithm: 'AES-GCM' };
  }

  async decrypt(
    encryptedData: Uint8Array,
    iv: Uint8Array,
    key?: Uint8Array,
    algorithm: CryptoAlgorithm = 'AES-GCM',
    salt?: Uint8Array,
    passphrase?: string,
  ): Promise<Uint8Array> {
    if (passphrase && salt) {
      return this.decryptWithPassphrase(encryptedData, passphrase, iv, salt, algorithm);
    }

    const k = key || this.vaultKey;
    if (!k) throw new Error('Vault key not initialized');

    if (algorithm === 'AES-GCM') {
      await initOnce();
      return aes_gcm_decrypt(encryptedData, k, iv);
    }

    throw new Error('Default Vault only supports AES-GCM.');
  }

  arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) binary += String.fromCharCode(buffer[i]);
    return btoa(binary);
  }

  base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async encryptString(data: string, key?: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
    const k = key || this.vaultKey;
    if (!k) throw new Error('Vault key not initialized');
    await initOnce();
    const rawData = new TextEncoder().encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = aes_gcm_encrypt(rawData, k, iv);
    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
    };
  }

  async decryptString(ciphertextB64: string, ivB64: string, key?: Uint8Array): Promise<string> {
    const k = key || this.vaultKey;
    if (!k) throw new Error('Vault key not initialized');
    await initOnce();
    const ciphertextBytes = this.base64ToArrayBuffer(ciphertextB64);
    const ivBytes = this.base64ToArrayBuffer(ivB64);
    const decrypted = aes_gcm_decrypt(ciphertextBytes, k, ivBytes);
    return new TextDecoder().decode(decrypted);
  }
}

export const cryptoService = new EncryptionService();
