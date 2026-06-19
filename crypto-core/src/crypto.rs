use rand::RngCore;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

pub fn random_bytes(count: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; count];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    bytes
}

pub fn base64_encode(data: &[u8]) -> String {
    BASE64.encode(data)
}

pub fn base64_decode(encoded: &str) -> Result<Vec<u8>, String> {
    BASE64.decode(encoded).map_err(|e| format!("Base64 decode error: {}", e))
}

fn get_iv_length(algorithm: &str) -> Result<usize, String> {
    match algorithm {
        "AES-GCM" => Ok(12),
        "AES-CTR" => Ok(16),
        "ChaCha20-Poly1305" => Ok(12),
        "XChaCha20-Poly1305" => Ok(24),
        "Salsa20-Poly1305" => Ok(24),
        _ => Err(format!("Unknown algorithm: {}", algorithm)),
    }
}

pub fn encrypt_with_passphrase(
    data: &[u8],
    passphrase: &str,
    algorithm: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<String, String> {
    let salt = random_bytes(16);
    let key = crate::kdf::derive_key(
        passphrase.as_bytes(),
        &salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );
    let iv_len = get_iv_length(algorithm)?;
    let iv = random_bytes(iv_len);

    let ciphertext = match algorithm {
        "AES-GCM" => crate::aead::aes_gcm_encrypt(data, &key, &iv).map_err(|e| e.to_string())?,
        "AES-CTR" => crate::aes_ctr::encrypt(data, &key, &iv).map_err(|e| e.to_string())?,
        "ChaCha20-Poly1305" => {
            crate::chacha_salsa::chacha20_poly1305_encrypt(data, &key, &iv)
                .map_err(|e| e.to_string())?
        }
        "XChaCha20-Poly1305" => {
            crate::chacha_salsa::xchacha20_poly1305_encrypt(data, &key, &iv)
                .map_err(|e| e.to_string())?
        }
        "Salsa20-Poly1305" => {
            crate::chacha_salsa::salsa20_poly1305_encrypt(data, &key, &iv)
                .map_err(|e| e.to_string())?
        }
        _ => return Err(format!("Algorithm {} not supported.", algorithm)),
    };

    let result = serde_json::json!({
        "ciphertext": base64_encode(&ciphertext),
        "iv": base64_encode(&iv),
        "salt": base64_encode(&salt),
        "algorithm": algorithm,
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

pub fn decrypt_with_passphrase(
    data: &[u8],
    passphrase: &str,
    iv: &[u8],
    salt: &[u8],
    algorithm: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    let key = crate::kdf::derive_key(
        passphrase.as_bytes(),
        salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );
    match algorithm {
        "AES-GCM" => crate::aead::aes_gcm_decrypt(data, &key, iv).map_err(|e| e.to_string()),
        "AES-CTR" => crate::aes_ctr::decrypt(data, &key, iv).map_err(|e| e.to_string()),
        "ChaCha20-Poly1305" => {
            crate::chacha_salsa::chacha20_poly1305_decrypt(data, &key, iv)
                .map_err(|e| e.to_string())
        }
        "XChaCha20-Poly1305" => {
            crate::chacha_salsa::xchacha20_poly1305_decrypt(data, &key, iv)
                .map_err(|e| e.to_string())
        }
        "Salsa20-Poly1305" => {
            crate::chacha_salsa::salsa20_poly1305_decrypt(data, &key, iv)
                .map_err(|e| e.to_string())
        }
        _ => Err(format!("Algorithm {} not supported.", algorithm)),
    }
}

pub fn encrypt(data: &[u8], key: &[u8]) -> Result<String, String> {
    if key.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    let iv = random_bytes(12);
    let ciphertext =
        crate::aead::aes_gcm_encrypt(data, key, &iv).map_err(|e| e.to_string())?;
    let result = serde_json::json!({
        "ciphertext": base64_encode(&ciphertext),
        "iv": base64_encode(&iv),
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

pub fn decrypt(ciphertext_b64: &str, iv_b64: &str, key: &[u8]) -> Result<Vec<u8>, String> {
    if key.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    let ciphertext = base64_decode(ciphertext_b64)?;
    let iv = base64_decode(iv_b64)?;
    crate::aead::aes_gcm_decrypt(&ciphertext, key, &iv).map_err(|e| e.to_string())
}

pub fn encrypt_string(data: &str, key: &[u8]) -> Result<String, String> {
    if key.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    let iv = random_bytes(12);
    let ciphertext =
        crate::aead::aes_gcm_encrypt(data.as_bytes(), key, &iv).map_err(|e| e.to_string())?;
    let result = serde_json::json!({
        "ciphertext": base64_encode(&ciphertext),
        "iv": base64_encode(&iv),
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

pub fn decrypt_string(ciphertext_b64: &str, iv_b64: &str, key: &[u8]) -> Result<String, String> {
    let ciphertext = base64_decode(ciphertext_b64)?;
    let iv = base64_decode(iv_b64)?;
    let plaintext =
        crate::aead::aes_gcm_decrypt(&ciphertext, key, &iv).map_err(|e| e.to_string())?;
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}
