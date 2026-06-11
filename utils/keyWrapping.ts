import {
  derive_master_key,
  wrap_raw_key,
  unwrap_raw_key,
  generate_recovery_codes as wasmGenerateCodes,
  parse_code_index as wasmParseIndex,
  base64_encode as b64enc,
  base64_decode as b64dec,
} from '../crypto-core/index';

export type { CryptoMetadata, VaultWrappers } from '../types';

function wrapperToJson(wrapper: string | { ciphertext: string; iv: string }): string {
  if (typeof wrapper === 'string') return wrapper;
  return JSON.stringify(wrapper);
}

export function deriveKey(password: string, salt: Uint8Array, _purpose?: string, _isMobile?: boolean): Uint8Array {
  return derive_master_key(password, salt, _isMobile ?? false);
}

export async function wrapRawKey(rawKey: Uint8Array, wrappingKey: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
  const json = wrap_raw_key(rawKey, wrappingKey);
  return JSON.parse(json);
}

export async function unwrapRawKey(
  wrapper: string | { ciphertext: string; iv: string },
  wrappingKey: Uint8Array,
): Promise<Uint8Array> {
  return unwrap_raw_key(wrapperToJson(wrapper), wrappingKey);
}

export function bytesToBase64(bytes: Uint8Array): string {
  return b64enc(bytes);
}

export function base64ToBytes(b64: string): Uint8Array {
  return b64dec(b64);
}

export function generateRecoveryCodes(): string[] {
  return wasmGenerateCodes();
}

export function parseCodeIndex(code: string): string | null {
  return wasmParseIndex(code) ?? null;
}
