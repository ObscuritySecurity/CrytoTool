
import { argon2id } from 'hash-wasm';
import sodium from 'libsodium-wrappers';
// Crypto Service Notes:
// - All cryptographic operations rely on WebCrypto where possible and libsodium-wrappers for hardened primitives.
// - Vault keys are kept in memory and never written to localStorage to minimize leakage risk.
// - This module is a central point for encryption/decryption logic; keep interfaces stable and well-documented.
import { 
    aesGcm, 
    aesCtr, 
    chacha20Poly1305, 
    xChacha20Poly1305, 
    salsa20Poly1305,
    IV_LENGTHS 
} from './cryptoPrimitives';
import { streamCrypto } from './streamCrypto';

export type CryptoAlgorithm = 'AES-GCM' | 'AES-CTR' | 'ChaCha20-Poly1305' | 'XChaCha20-Poly1305' | 'Salsa20-Poly1305' | 'AES-GCM-Stream';

export interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  algorithm: CryptoAlgorithm;
}

class EncryptionService {
  private vaultKey: CryptoKey | null = null;
  private sodiumReady: Promise<void>;

  constructor() {
    this.sodiumReady = sodium.ready;
  }

  // --- MASTER KEY DERIVATION (For Vault Access) ---
  async deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const hash = await argon2id({
      password,
      salt,
      iterations: 10,
      memory: 65536,
      memorySize: 65536,
      parallelism: 4,
      hashLength: 32, 
      outputType: 'binary',
    }) as Uint8Array;

    return await window.crypto.subtle.importKey(
      'raw',
      hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength) as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  setVaultKey(key: CryptoKey) {
    this.vaultKey = key;
  }

  clearKeys() {
    this.vaultKey = null;
  }

  async generateVaultKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // --- UNIFIED ENCRYPTION API ---

  /**
   * Encrypt data using isolated primitives.
   */
  async encryptWithPassphrase(
    data: Blob | Uint8Array, 
    passphrase: string, 
    algorithm: CryptoAlgorithm
  ): Promise<EncryptedData> {
    await this.sodiumReady;
    
    const rawData = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
    const salt = window.crypto.getRandomValues(new Uint8Array(16));

    // Derive a 32-byte raw key from the passphrase using Libsodium's Generic Hash (BLAKE2b)
    // This creates a raw Uint8Array key suitable for passing to the primitives.
    const passphraseBytes = new TextEncoder().encode(passphrase);
    const key = sodium.crypto_generichash(32, passphraseBytes, salt);

    // Get correct IV length from primitives config
    const ivLength = IV_LENGTHS[algorithm] || 12;
    const iv = window.crypto.getRandomValues(new Uint8Array(ivLength));

    let ciphertext: Uint8Array;

    // Delegate to isolated primitives
    switch (algorithm) {
        case 'AES-GCM':
            ciphertext = await aesGcm.encrypt(rawData, key, iv);
            break;
        case 'AES-CTR':
            ciphertext = await aesCtr.encrypt(rawData, key, iv);
            break;
        case 'ChaCha20-Poly1305':
            ciphertext = chacha20Poly1305.encrypt(rawData, key, iv);
            break;
        case 'XChaCha20-Poly1305':
            ciphertext = xChacha20Poly1305.encrypt(rawData, key, iv);
            break;
        case 'Salsa20-Poly1305':
            ciphertext = salsa20Poly1305.encrypt(rawData, key, iv);
            break;
        default:
            throw new Error(`Algorithm ${algorithm} not supported.`);
    }

    return {
        ciphertext,
        iv,
        salt, // Needed to re-derive key on decrypt
        algorithm
    };
  }

  /**
   * Decrypt data using isolated primitives.
   */
  async decryptWithPassphrase(
    encryptedData: Uint8Array, 
    passphrase: string, 
    iv: Uint8Array, 
    salt: Uint8Array, 
    algorithm: CryptoAlgorithm
  ): Promise<Uint8Array> {
    await this.sodiumReady;

    if (algorithm === 'AES-GCM-Stream') {
        return await streamCrypto.decrypt(encryptedData, passphrase);
    }

    // Re-derive Key
    const passphraseBytes = new TextEncoder().encode(passphrase);
    const key = sodium.crypto_generichash(32, passphraseBytes, salt);

    switch (algorithm) {
        case 'AES-GCM':
            return await aesGcm.decrypt(encryptedData, key, iv);
        case 'AES-CTR':
            return await aesCtr.decrypt(encryptedData, key, iv);
        case 'ChaCha20-Poly1305':
            return chacha20Poly1305.decrypt(encryptedData, key, iv);
        case 'XChaCha20-Poly1305':
            return xChacha20Poly1305.decrypt(encryptedData, key, iv);
        case 'Salsa20-Poly1305':
            return salsa20Poly1305.decrypt(encryptedData, key, iv);
        default:
            throw new Error(`Algorithm ${algorithm} not supported.`);
    }
  }

  // --- DEFAULT (AUTO) ENCRYPTION ---
  // Still uses AES-GCM via the Vault Key object directly for performance/compatibility with the global vault state
  async encrypt(data: Blob | Uint8Array, key: CryptoKey = this.vaultKey!): Promise<EncryptedData> {
    if (!key) throw new Error("Vault key not initialized");
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const rawData = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
      key,
      rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer
    );

    return {
      ciphertext: new Uint8Array(ciphertext),
      iv,
      salt: new Uint8Array(0),
      algorithm: 'AES-GCM'
    };
  }

  async decrypt(
      encryptedData: Uint8Array, 
      iv: Uint8Array, 
      key: CryptoKey = this.vaultKey!, 
      algorithm: CryptoAlgorithm = 'AES-GCM',
      salt?: Uint8Array,
      passphrase?: string // If manual decryption
  ): Promise<Uint8Array> {
    
    // Dacă avem passphrase, înseamnă că e custom encryption -> Delegăm la noua logică
    if (passphrase && salt) {
        return this.decryptWithPassphrase(encryptedData, passphrase, iv, salt, algorithm);
    }

    if (!key) throw new Error("Vault key not initialized");

    // Default Vault Decryption
    if (algorithm === 'AES-GCM') {
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
          key,
          encryptedData.buffer.slice(encryptedData.byteOffset, encryptedData.byteOffset + encryptedData.byteLength) as ArrayBuffer
        );
        return new Uint8Array(decrypted);
    } 
    
    throw new Error("Default Vault only supports AES-GCM.");
  }

  arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

export const cryptoService = new EncryptionService();
