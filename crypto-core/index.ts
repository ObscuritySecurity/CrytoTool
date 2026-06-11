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
  random_bytes as wasm_random_bytes,
  base64_encode as wasm_base64_encode,
  base64_decode as wasm_base64_decode,
  generate_passphrase as wasm_generate_passphrase,
  generate_recovery_codes as wasm_generate_recovery_codes,
  parse_code_index as wasm_parse_code_index,
  encrypt_with_passphrase as wasm_encrypt_with_passphrase,
  decrypt_with_passphrase as wasm_decrypt_with_passphrase,
  encrypt as wasm_encrypt,
  decrypt as wasm_decrypt,
  encrypt_string as wasm_encrypt_string,
  decrypt_string as wasm_decrypt_string,
  backup_encrypt as wasm_backup_encrypt,
  backup_decrypt as wasm_backup_decrypt,
  wrap_raw_key as wasm_wrap_raw_key,
  unwrap_raw_key as wasm_unwrap_raw_key,
  metadata_encrypt as wasm_metadata_encrypt,
  metadata_decrypt as wasm_metadata_decrypt,
  pin_hash as wasm_pin_hash,
  pin_verify as wasm_pin_verify,
  get_argon_params as wasm_get_argon_params,
  vault_encrypt_keys as wasm_vault_encrypt_keys,
  vault_decrypt_keys as wasm_vault_decrypt_keys,
  derive_master_key as wasm_derive_master_key,
  generate_vault_key as wasm_generate_vault_key,
  validate_pin as wasm_validate_pin,
  get_backoff_time as wasm_get_backoff_time,
  is_safe_image_url as wasm_is_safe_image_url,
  sanitize_url as wasm_sanitize_url,
  escape_html as wasm_escape_html,
  safe_mime_type_for_ext as wasm_safe_mime_type_for_ext,
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
  password: Uint8Array, salt: Uint8Array, iterations: number,
  memorySizeKib: number, parallelism: number, outputLength: number,
): Uint8Array {
  return wasm_derive_key(password, salt, iterations, memorySizeKib, parallelism, outputLength);
}

export function stream_encrypt(
  data: Uint8Array, passphrase: string,
  argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): Uint8Array {
  return wasm_stream_encrypt(data, passphrase, argonIterations, argonMemoryKib, argonParallelism);
}

export function stream_decrypt(
  encryptedData: Uint8Array, passphrase: string,
  argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): Uint8Array {
  return wasm_stream_decrypt(encryptedData, passphrase, argonIterations, argonMemoryKib, argonParallelism);
}

export function random_bytes(count: number): Uint8Array {
  return wasm_random_bytes(count);
}

export function base64_encode(data: Uint8Array): string {
  return wasm_base64_encode(data);
}

export function base64_decode(encoded: string): Uint8Array {
  return wasm_base64_decode(encoded);
}

export function generate_passphrase(): string {
  return wasm_generate_passphrase();
}

export function generate_recovery_codes(): string[] {
  return wasm_generate_recovery_codes();
}

export function parse_code_index(code: string): string | null {
  return wasm_parse_code_index(code) ?? null;
}

export function encrypt_with_passphrase(
  data: Uint8Array, passphrase: string, algorithm: string,
  argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): string {
  return wasm_encrypt_with_passphrase(data, passphrase, algorithm, argonIterations, argonMemoryKib, argonParallelism);
}

export function decrypt_with_passphrase(
  data: Uint8Array, passphrase: string, iv: Uint8Array, salt: Uint8Array, algorithm: string,
  argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): Uint8Array {
  return wasm_decrypt_with_passphrase(data, passphrase, iv, salt, algorithm, argonIterations, argonMemoryKib, argonParallelism);
}

export function encrypt(data: Uint8Array, key: Uint8Array): string {
  return wasm_encrypt(data, key);
}

export function decrypt(ciphertextB64: string, ivB64: string, key: Uint8Array): Uint8Array {
  return wasm_decrypt(ciphertextB64, ivB64, key);
}

export function encrypt_string(data: string, key: Uint8Array): string {
  return wasm_encrypt_string(data, key);
}

export function decrypt_string(ciphertextB64: string, ivB64: string, key: Uint8Array): string {
  return wasm_decrypt_string(ciphertextB64, ivB64, key);
}

export function backup_encrypt(
  plaintext: Uint8Array, passphrase: string,
  argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): Uint8Array {
  return wasm_backup_encrypt(plaintext, passphrase, argonIterations, argonMemoryKib, argonParallelism);
}

export function backup_decrypt(
  data: Uint8Array, passphrase: string,
  argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): Uint8Array {
  return wasm_backup_decrypt(data, passphrase, argonIterations, argonMemoryKib, argonParallelism);
}

export function wrap_raw_key(rawKey: Uint8Array, wrappingKey: Uint8Array): string {
  return wasm_wrap_raw_key(rawKey, wrappingKey);
}

export function unwrap_raw_key(wrapperJson: string, wrappingKey: Uint8Array): Uint8Array {
  return wasm_unwrap_raw_key(wrapperJson, wrappingKey);
}

export function metadata_encrypt(metaJson: string, key: Uint8Array): string {
  return wasm_metadata_encrypt(metaJson, key);
}

export function metadata_decrypt(encryptedJson: string, key: Uint8Array): string {
  return wasm_metadata_decrypt(encryptedJson, key);
}

export function pin_hash(
  pin: string, argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): string {
  return wasm_pin_hash(pin, argonIterations, argonMemoryKib, argonParallelism);
}

export function pin_verify(
  pin: string, storedJson: string,
  argonIterations: number, argonMemoryKib: number, argonParallelism: number,
): boolean {
  return wasm_pin_verify(pin, storedJson, argonIterations, argonMemoryKib, argonParallelism);
}

export function get_argon_params(purpose: string, isMobile: boolean): string {
  return wasm_get_argon_params(purpose, isMobile);
}

export function vault_encrypt_keys(keysJson: string, key: Uint8Array): string {
  return wasm_vault_encrypt_keys(keysJson, key);
}

export function vault_decrypt_keys(encryptedJson: string, key: Uint8Array): string {
  return wasm_vault_decrypt_keys(encryptedJson, key);
}

export function derive_master_key(password: string, salt: Uint8Array, isMobile: boolean): Uint8Array {
  return wasm_derive_master_key(password, salt, isMobile);
}

export function generate_vault_key(): Uint8Array {
  return wasm_generate_vault_key();
}

export function validate_pin(pin: string): void {
  wasm_validate_pin(pin);
}

export function get_backoff_time(attempts: number): number {
  return Number(wasm_get_backoff_time(attempts));
}

export function is_safe_image_url(url: string): boolean {
  return wasm_is_safe_image_url(url);
}

export function sanitize_url(url: string, fallback: string): string {
  return wasm_sanitize_url(url, fallback);
}

export function escape_html(text: string): string {
  return wasm_escape_html(text);
}

export function safe_mime_type_for_ext(ext: string): string {
  return wasm_safe_mime_type_for_ext(ext);
}

export type {
  InitInput, InitOutput, SyncInitInput,
} from './pkg/crypto_core.js';
