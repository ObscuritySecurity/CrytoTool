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
