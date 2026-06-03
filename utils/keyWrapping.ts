import { argon2id } from 'hash-wasm';

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function deriveKey(
  secret: string,
  salt: Uint8Array,
  params?: { iterations?: number; memorySize?: number; parallelism?: number }
): Promise<CryptoKey> {
  const { iterations = 19, memorySize = 131072, parallelism = 4 } = params || {};
  const hash = await argon2id({
    password: secret,
    salt,
    iterations,
    memorySize,
    parallelism,
    hashLength: 32,
    outputType: 'binary',
  }) as Uint8Array;

  return await window.crypto.subtle.importKey(
    'raw',
    hash as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function wrapRawKey(
  rawKey: Uint8Array,
  wrappingKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    wrappingKey,
    rawKey as unknown as BufferSource
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function unwrapRawKey(
  wrapper: { ciphertext: string; iv: string },
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  const ciphertext = base64ToBytes(wrapper.ciphertext);
  const iv = base64ToBytes(wrapper.iv);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    wrappingKey,
    ciphertext as unknown as BufferSource
  );
  return new Uint8Array(decrypted);
}

export function generateRecoveryCodes(): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const idx = String(i + 1).padStart(2, '0');
    const randomValues = new Uint8Array(12);
    window.crypto.getRandomValues(randomValues);
    const alphabetLength = chars.length;
    const maxUnbiased = Math.floor(256 / alphabetLength) * alphabetLength;
    let body = '';
    let pos = 0;
    while (body.length < 12) {
      const val = randomValues[pos++];
      if (val < maxUnbiased) {
        body += chars[val % alphabetLength];
        if ((body.length + 1) % 4 === 0 && body.length < 12) body += '-';
      }
    }
    codes.push(`CRYTO-${idx}-${body}`);
  }
  return codes;
}

export function parseCodeIndex(code: string): string | null {
  const match = code.match(/^CRYTO-(\d{2})-/);
  return match ? match[1] : null;
}

export interface CryptoMetadata {
  master_salt: string;
  recovery_salts: string[];
}

export interface VaultWrappers {
  master: { ciphertext: string; iv: string };
  recovery: Record<string, { ciphertext: string; iv: string }>;
}
