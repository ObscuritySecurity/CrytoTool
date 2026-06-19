use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

pub fn encrypt_keys(keys_json: &str, key: &[u8]) -> Result<String, String> {
    if key.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    let iv = crate::crypto::random_bytes(12);
    let ciphertext =
        crate::aead::aes_gcm_encrypt(keys_json.as_bytes(), key, &iv).map_err(|e| e.to_string())?;
    let result = serde_json::json!({
        "iv": BASE64.encode(&iv),
        "data": BASE64.encode(&ciphertext),
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

pub fn decrypt_keys(encrypted_json: &str, key: &[u8]) -> Result<String, String> {
    if key.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    let parsed: serde_json::Value =
        serde_json::from_str(encrypted_json).map_err(|e| e.to_string())?;
    let iv_b64 = parsed["iv"].as_str().ok_or("Missing iv")?;
    let data_b64 = parsed["data"].as_str().ok_or("Missing data")?;
    let iv = BASE64.decode(iv_b64).map_err(|e| e.to_string())?;
    let ciphertext = BASE64.decode(data_b64).map_err(|e| e.to_string())?;
    let plaintext =
        crate::aead::aes_gcm_decrypt(&ciphertext, key, &iv).map_err(|e| e.to_string())?;
    let result = String::from_utf8(plaintext).map_err(|e| e.to_string())?;
    serde_json::from_str::<serde_json::Value>(&result)
        .map_err(|e| format!("Decrypted data is not valid JSON: {}", e))?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_keys_roundtrip() {
        let key = [0x42u8; 32];
        let keys = r#"[{"id":"1","key":"abc","algorithm":"AES-GCM","fileName":"test","categoryId":"cat1","date":"2024-01-01","fileId":"f1"}]"#;
        let encrypted = encrypt_keys(keys, &key).unwrap();
        let decrypted = decrypt_keys(&encrypted, &key).unwrap();
        assert_eq!(decrypted, keys);
    }

    #[test]
    fn test_decrypt_keys_invalid_json() {
        let key = [0x42u8; 32];
        let iv = crate::crypto::random_bytes(12);
        let garbage = crate::aead::aes_gcm_encrypt(b"not-json", &key, &iv).unwrap();
        let stored = serde_json::json!({
            "iv": BASE64.encode(&iv),
            "data": BASE64.encode(&garbage),
        });
        let result = decrypt_keys(&serde_json::to_string(&stored).unwrap(), &key);
        assert!(result.is_err());
    }

    #[test]
    fn test_encrypt_keys_wrong_key_length() {
        let short_key = [0x42u8; 16];
        let result = encrypt_keys("[]", &short_key);
        assert!(result.is_err());
    }
}
