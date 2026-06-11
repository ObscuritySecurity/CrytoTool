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

#[tauri::command]
fn derive_key(
    password: Vec<u8>,
    salt: Vec<u8>,
    iterations: u32,
    memory_size_kib: u32,
    parallelism: u32,
    output_length: usize,
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
    data: Vec<u8>,
    passphrase: String,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    crypto_core::stream::stream_encrypt(
        &data, &passphrase, argon_iterations, argon_memory_kib, argon_parallelism,
    )
    .map_err(map_err)
}

#[tauri::command]
fn stream_decrypt(
    encrypted_data: Vec<u8>,
    passphrase: String,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    crypto_core::stream::stream_decrypt(
        &encrypted_data, &passphrase, argon_iterations, argon_memory_kib, argon_parallelism,
    )
    .map_err(map_err)
}
