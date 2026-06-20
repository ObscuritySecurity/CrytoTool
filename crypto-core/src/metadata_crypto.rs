use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

pub fn metadata_encrypt(meta_json: &str, key: &[u8]) -> Result<String, String> {
    if key.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    let iv = crate::crypto::random_bytes(12);
    let ciphertext =
        crate::aead::aes_gcm_encrypt(meta_json.as_bytes(), key, &iv).map_err(|e| e.to_string())?;
    let result = serde_json::json!({
        "ciphertext": BASE64.encode(&ciphertext),
        "iv": BASE64.encode(&iv),
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

pub fn metadata_decrypt(encrypted_json: &str, key: &[u8]) -> Result<String, String> {
    if key.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    let parsed: serde_json::Value =
        serde_json::from_str(encrypted_json).map_err(|e| e.to_string())?;
    let ciphertext_b64 = parsed["ciphertext"]
        .as_str()
        .ok_or("Missing ciphertext")?;
    let iv_b64 = parsed["iv"].as_str().ok_or("Missing iv")?;
    let ciphertext = BASE64.decode(ciphertext_b64).map_err(|e| e.to_string())?;
    let iv = BASE64.decode(iv_b64).map_err(|e| e.to_string())?;
    let plaintext =
        crate::aead::aes_gcm_decrypt(&ciphertext, key, &iv).map_err(|e| e.to_string())?;
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metadata_encrypt_roundtrip() {
        let key = [0x42u8; 32];
        let meta = r#"{"name":"test","tags":[{"id":"1","label":"tag1","color":"red"}]}"#;
        let encrypted = metadata_encrypt(meta, &key).unwrap();
        let decrypted = metadata_decrypt(&encrypted, &key).unwrap();
        assert_eq!(decrypted, meta);
    }
}
