import { ensureInit, derive_key as wasm_derive_key, aes_gcm_encrypt, aes_gcm_decrypt } from '../crypto-core/index';
import { getArgonParams, type ArgonPurpose } from './platform';

let inited = false;
async function initOnce() {
  if (!inited) { await ensureInit(); inited = true; }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function deriveKey(
  secret: string,
  salt: Uint8Array,
  purpose: ArgonPurpose = 'master'
): Promise<Uint8Array> {
  await initOnce();
  const { iterations, memorySize, parallelism } = await getArgonParams(purpose);
  return wasm_derive_key(
    new TextEncoder().encode(secret),
    salt,
    iterations,
    memorySize,
    parallelism,
    32,
  );
}

export async function wrapRawKey(
  rawKey: Uint8Array,
  wrappingKey: Uint8Array,
): Promise<{ ciphertext: string; iv: string }> {
  await initOnce();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = aes_gcm_encrypt(rawKey, wrappingKey, iv);
  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
  };
}

export async function unwrapRawKey(
  wrapper: { ciphertext: string; iv: string },
  wrappingKey: Uint8Array,
): Promise<Uint8Array> {
  await initOnce();
  const ciphertext = base64ToBytes(wrapper.ciphertext);
  const iv = base64ToBytes(wrapper.iv);
  return aes_gcm_decrypt(ciphertext, wrappingKey, iv);
}

export function generateRecoveryCodes(): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const idx = String(i + 1).padStart(2, '0');
    const randomValues = new Uint8Array(12);
    crypto.getRandomValues(randomValues);
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
