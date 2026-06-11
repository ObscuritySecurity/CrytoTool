#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_biometry::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            // Primitives
            derive_key,
            aes_gcm_encrypt,
            aes_gcm_decrypt,
            aes_ctr_encrypt,
            aes_ctr_decrypt,
            chacha20_poly1305_encrypt,
            chacha20_poly1305_decrypt,
            xchacha20_poly1305_encrypt,
            xchacha20_poly1305_decrypt,
            salsa20_poly1305_encrypt,
            salsa20_poly1305_decrypt,
            stream_encrypt,
            stream_decrypt,
            // Composite ops
            random_bytes,
            base64_encode,
            base64_decode,
            generate_passphrase,
            generate_recovery_codes,
            encrypt_with_passphrase,
            decrypt_with_passphrase,
            encrypt,
            decrypt,
            encrypt_string,
            decrypt_string,
            backup_encrypt,
            backup_decrypt,
            wrap_raw_key,
            unwrap_raw_key,
            metadata_encrypt,
            metadata_decrypt,
            pin_hash,
            pin_verify,
            get_argon_params,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// -- Primitives --

#[tauri::command]
fn derive_key(
    password: Vec<u8>, salt: Vec<u8>, iterations: u32,
    memory_size_kib: u32, parallelism: u32, output_length: usize,
) -> Vec<u8> {
    crypto_core::kdf::derive_key(&password, &salt, iterations, memory_size_kib, parallelism, output_length)
}

#[tauri::command]
fn aes_gcm_encrypt(plaintext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::aead::aes_gcm_encrypt(&plaintext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn aes_gcm_decrypt(ciphertext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::aead::aes_gcm_decrypt(&ciphertext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn aes_ctr_encrypt(plaintext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::aes_ctr::encrypt(&plaintext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn aes_ctr_decrypt(data: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::aes_ctr::decrypt(&data, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn chacha20_poly1305_encrypt(plaintext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::chacha_salsa::chacha20_poly1305_encrypt(&plaintext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn chacha20_poly1305_decrypt(ciphertext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::chacha_salsa::chacha20_poly1305_decrypt(&ciphertext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn xchacha20_poly1305_encrypt(plaintext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::chacha_salsa::xchacha20_poly1305_encrypt(&plaintext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn xchacha20_poly1305_decrypt(ciphertext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::chacha_salsa::xchacha20_poly1305_decrypt(&ciphertext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn salsa20_poly1305_encrypt(plaintext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::chacha_salsa::salsa20_poly1305_encrypt(&plaintext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn salsa20_poly1305_decrypt(ciphertext: Vec<u8>, key: Vec<u8>, nonce: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::chacha_salsa::salsa20_poly1305_decrypt(&ciphertext, &key, &nonce).map_err(map_err)
}

#[tauri::command]
fn stream_encrypt(
    data: Vec<u8>, passphrase: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    crypto_core::stream::stream_encrypt(&data, &passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(map_err)
}

#[tauri::command]
fn stream_decrypt(
    encrypted_data: Vec<u8>, passphrase: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    crypto_core::stream::stream_decrypt(&encrypted_data, &passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
        .map_err(map_err)
}

// -- Composite ops --

#[tauri::command]
fn random_bytes(count: usize) -> Vec<u8> {
    crypto_core::ops::random_bytes(count)
}

#[tauri::command]
fn base64_encode(data: Vec<u8>) -> String {
    crypto_core::ops::base64_encode(&data)
}

#[tauri::command]
fn base64_decode(encoded: String) -> Result<Vec<u8>, String> {
    crypto_core::ops::base64_decode(&encoded)
}

#[tauri::command]
fn generate_passphrase() -> String {
    crypto_core::ops::generate_passphrase()
}

#[tauri::command]
fn generate_recovery_codes() -> Vec<String> {
    crypto_core::ops::generate_recovery_codes()
}

#[tauri::command]
fn encrypt_with_passphrase(
    data: Vec<u8>, passphrase: String, algorithm: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<String, String> {
    crypto_core::ops::encrypt_with_passphrase(&data, &passphrase, &algorithm, argon_iterations, argon_memory_kib, argon_parallelism)
}

#[tauri::command]
fn decrypt_with_passphrase(
    data: Vec<u8>, passphrase: String, iv: Vec<u8>, salt: Vec<u8>, algorithm: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    crypto_core::ops::decrypt_with_passphrase(&data, &passphrase, &iv, &salt, &algorithm, argon_iterations, argon_memory_kib, argon_parallelism)
}

#[tauri::command]
fn encrypt(data: Vec<u8>, key: Vec<u8>) -> Result<String, String> {
    crypto_core::ops::encrypt(&data, &key)
}

#[tauri::command]
fn decrypt(ciphertext_b64: String, iv_b64: String, key: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::ops::decrypt(&ciphertext_b64, &iv_b64, &key)
}

#[tauri::command]
fn encrypt_string(data: String, key: Vec<u8>) -> Result<String, String> {
    crypto_core::ops::encrypt_string(&data, &key)
}

#[tauri::command]
fn decrypt_string(ciphertext_b64: String, iv_b64: String, key: Vec<u8>) -> Result<String, String> {
    crypto_core::ops::decrypt_string(&ciphertext_b64, &iv_b64, &key)
}

#[tauri::command]
fn backup_encrypt(
    plaintext: Vec<u8>, passphrase: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    crypto_core::ops::backup_encrypt(&plaintext, &passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
}

#[tauri::command]
fn backup_decrypt(
    data: Vec<u8>, passphrase: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    crypto_core::ops::backup_decrypt(&data, &passphrase, argon_iterations, argon_memory_kib, argon_parallelism)
}

#[tauri::command]
fn wrap_raw_key(raw_key: Vec<u8>, wrapping_key: Vec<u8>) -> Result<String, String> {
    crypto_core::ops::wrap_raw_key(&raw_key, &wrapping_key)
}

#[tauri::command]
fn unwrap_raw_key(wrapper_json: String, wrapping_key: Vec<u8>) -> Result<Vec<u8>, String> {
    crypto_core::ops::unwrap_raw_key(&wrapper_json, &wrapping_key)
}

#[tauri::command]
fn metadata_encrypt(meta_json: String, key: Vec<u8>) -> Result<String, String> {
    crypto_core::ops::metadata_encrypt(&meta_json, &key)
}

#[tauri::command]
fn metadata_decrypt(encrypted_json: String, key: Vec<u8>) -> Result<String, String> {
    crypto_core::ops::metadata_decrypt(&encrypted_json, &key)
}

#[tauri::command]
fn pin_hash(
    pin: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<String, String> {
    crypto_core::ops::pin_hash(&pin, argon_iterations, argon_memory_kib, argon_parallelism)
}

#[tauri::command]
fn pin_verify(
    pin: String, stored_json: String,
    argon_iterations: u32, argon_memory_kib: u32, argon_parallelism: u32,
) -> Result<bool, String> {
    crypto_core::ops::pin_verify(&pin, &stored_json, argon_iterations, argon_memory_kib, argon_parallelism)
}

#[tauri::command]
fn get_argon_params(purpose: String, is_mobile: bool) -> Result<String, String> {
    crypto_core::ops::get_argon_params(&purpose, is_mobile)
}
