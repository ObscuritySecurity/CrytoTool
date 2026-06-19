use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn derive_key(
    password: &[u8],
    salt: &[u8],
    iterations: u32,
    memory_size_kib: u32,
    parallelism: u32,
    output_length: usize,
) -> Vec<u8> {
    crate::kdf::derive_key(password, salt, iterations, memory_size_kib, parallelism, output_length)
}

#[wasm_bindgen]
pub fn aes_gcm_encrypt(plaintext: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, JsValue> {
    crate::aead::aes_gcm_encrypt(plaintext, key, nonce).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn aes_gcm_decrypt(ciphertext: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, JsValue> {
    crate::aead::aes_gcm_decrypt(ciphertext, key, nonce).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn aes_ctr_encrypt(plaintext: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, JsValue> {
    crate::aes_ctr::encrypt(plaintext, key, nonce).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn aes_ctr_decrypt(data: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, JsValue> {
    crate::aes_ctr::decrypt(data, key, nonce).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn chacha20_poly1305_encrypt(
    plaintext: &[u8], key: &[u8], nonce: &[u8],
) -> Result<Vec<u8>, JsValue> {
    crate::chacha_salsa::chacha20_poly1305_encrypt(plaintext, key, nonce)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn chacha20_poly1305_decrypt(
    ciphertext: &[u8], key: &[u8], nonce: &[u8],
) -> Result<Vec<u8>, JsValue> {
    crate::chacha_salsa::chacha20_poly1305_decrypt(ciphertext, key, nonce)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn xchacha20_poly1305_encrypt(
    plaintext: &[u8], key: &[u8], nonce: &[u8],
) -> Result<Vec<u8>, JsValue> {
    crate::chacha_salsa::xchacha20_poly1305_encrypt(plaintext, key, nonce)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn xchacha20_poly1305_decrypt(
    ciphertext: &[u8], key: &[u8], nonce: &[u8],
) -> Result<Vec<u8>, JsValue> {
    crate::chacha_salsa::xchacha20_poly1305_decrypt(ciphertext, key, nonce)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn salsa20_poly1305_encrypt(
    plaintext: &[u8], key: &[u8], nonce: &[u8],
) -> Result<Vec<u8>, JsValue> {
    crate::chacha_salsa::salsa20_poly1305_encrypt(plaintext, key, nonce)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn salsa20_poly1305_decrypt(
    ciphertext: &[u8], key: &[u8], nonce: &[u8],
) -> Result<Vec<u8>, JsValue> {
    crate::chacha_salsa::salsa20_poly1305_decrypt(ciphertext, key, nonce)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn stream_encrypt(
    data: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, JsValue> {
    crate::stream::stream_encrypt(data, passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn stream_decrypt(
    encrypted_data: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, JsValue> {
    crate::stream::stream_decrypt(encrypted_data, passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

// -- Composite operations --

#[wasm_bindgen]
pub fn random_bytes(count: usize) -> Vec<u8> {
    crate::crypto::random_bytes(count)
}

#[wasm_bindgen]
pub fn base64_encode(data: &[u8]) -> String {
    crate::crypto::base64_encode(data)
}

#[wasm_bindgen]
pub fn base64_decode(encoded: &str) -> Result<Vec<u8>, JsValue> {
    crate::crypto::base64_decode(encoded).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn generate_passphrase() -> String {
    crate::backup_crypto::generate_passphrase()
}

#[wasm_bindgen]
pub fn generate_recovery_codes() -> Vec<String> {
    crate::key_wrapping::generate_recovery_codes()
}

#[wasm_bindgen]
pub fn parse_code_index(code: &str) -> Option<String> {
    crate::key_wrapping::parse_code_index(code)
}

#[wasm_bindgen]
pub fn encrypt_with_passphrase(
    data: &[u8],
    passphrase: &str,
    algorithm: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<String, JsValue> {
    crate::crypto::encrypt_with_passphrase(data, passphrase, algorithm, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn decrypt_with_passphrase(
    data: &[u8],
    passphrase: &str,
    iv: &[u8],
    salt: &[u8],
    algorithm: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, JsValue> {
    crate::crypto::decrypt_with_passphrase(data, passphrase, iv, salt, algorithm, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn encrypt(data: &[u8], key: &[u8]) -> Result<String, JsValue> {
    crate::crypto::encrypt(data, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn decrypt(ciphertext_b64: &str, iv_b64: &str, key: &[u8]) -> Result<Vec<u8>, JsValue> {
    crate::crypto::decrypt(ciphertext_b64, iv_b64, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn encrypt_string(data: &str, key: &[u8]) -> Result<String, JsValue> {
    crate::crypto::encrypt_string(data, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn decrypt_string(ciphertext_b64: &str, iv_b64: &str, key: &[u8]) -> Result<String, JsValue> {
    crate::crypto::decrypt_string(ciphertext_b64, iv_b64, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn backup_encrypt(
    plaintext: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, JsValue> {
    crate::backup_crypto::backup_encrypt(plaintext, passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn backup_decrypt(
    data: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, JsValue> {
    crate::backup_crypto::backup_decrypt(data, passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn wrap_raw_key(raw_key: &[u8], wrapping_key: &[u8]) -> Result<String, JsValue> {
    crate::key_wrapping::wrap_raw_key(raw_key, wrapping_key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn unwrap_raw_key(wrapper_json: &str, wrapping_key: &[u8]) -> Result<Vec<u8>, JsValue> {
    crate::key_wrapping::unwrap_raw_key(wrapper_json, wrapping_key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn metadata_encrypt(meta_json: &str, key: &[u8]) -> Result<String, JsValue> {
    crate::metadata_crypto::metadata_encrypt(meta_json, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn metadata_decrypt(encrypted_json: &str, key: &[u8]) -> Result<String, JsValue> {
    crate::metadata_crypto::metadata_decrypt(encrypted_json, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn pin_hash(
    pin: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<String, JsValue> {
    crate::security::pin_hash(pin, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn pin_verify(
    pin: &str,
    stored_json: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<bool, JsValue> {
    crate::security::pin_verify(pin, stored_json, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn get_argon_params(purpose: &str, tier: u32) -> Result<String, JsValue> {
    crate::threat_model::get_argon_params(purpose, tier).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn is_safe_image_url(url: &str) -> bool {
    crate::sanitize::is_safe_image_url(url)
}

#[wasm_bindgen]
pub fn sanitize_url(url: &str, fallback: &str) -> String {
    crate::sanitize::sanitize_url(url, fallback)
}

#[wasm_bindgen]
pub fn escape_html(text: &str) -> String {
    crate::sanitize::escape_html(text)
}

#[wasm_bindgen]
pub fn safe_mime_type_for_ext(ext: &str) -> String {
    crate::sanitize::safe_mime_type_for_ext(ext)
}

#[wasm_bindgen]
pub fn vault_encrypt_keys(keys_json: &str, key: &[u8]) -> Result<String, JsValue> {
    crate::vault_storage::encrypt_keys(keys_json, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn vault_decrypt_keys(encrypted_json: &str, key: &[u8]) -> Result<String, JsValue> {
    crate::vault_storage::decrypt_keys(encrypted_json, key).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn derive_master_key(password: &str, salt: &[u8], is_mobile: bool) -> Vec<u8> {
    crate::key_wrapping::derive_master_key(password, salt, is_mobile)
}

#[wasm_bindgen]
pub fn generate_vault_key() -> Vec<u8> {
    crate::key_wrapping::generate_vault_key()
}

#[wasm_bindgen]
pub fn validate_pin(pin: &str) -> Result<(), JsValue> {
    crate::security::validate_pin(pin).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn get_backoff_time(attempts: u32) -> u64 {
    crate::security::get_backoff_time(attempts)
}
