use rand::RngCore;

pub fn generate_recovery_codes() -> Vec<String> {
    let chars = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let alphabet_len = chars.len();
    let max_unbiased = (256 / alphabet_len) * alphabet_len;

    let mut codes = Vec::with_capacity(10);
    let mut rng = rand::rngs::OsRng;

    for i in 0..10 {
        let idx = format!("{:02}", i + 1);
        let mut body = String::with_capacity(14);
        let mut buf = [0u8; 32];
        rng.fill_bytes(&mut buf);
        let mut pos = 0;

        while body.len() < 12 {
            if pos >= buf.len() {
                rng.fill_bytes(&mut buf);
                pos = 0;
            }
            let val = buf[pos];
            pos += 1;
            if (val as usize) >= max_unbiased {
                continue;
            }
            body.push(chars[val as usize % alphabet_len] as char);
            if (body.len() + 1) % 4 == 0 && body.len() < 12 {
                body.push('-');
            }
        }
        codes.push(format!("CRYTO-{}-{}", idx, body));
    }
    codes
}

pub fn parse_code_index(code: &str) -> Option<String> {
    let rest = code.strip_prefix("CRYTO-")?;
    let idx = rest.get(..2)?;
    Some(idx.to_string())
}

pub fn wrap_raw_key(raw_key: &[u8], wrapping_key: &[u8]) -> Result<String, String> {
    if wrapping_key.len() != 32 {
        return Err("Wrapping key must be 32 bytes".to_string());
    }
    let iv = crate::crypto::random_bytes(12);
    let ciphertext =
        crate::aead::aes_gcm_encrypt(raw_key, wrapping_key, &iv).map_err(|e| e.to_string())?;
    let result = serde_json::json!({
        "ciphertext": crate::crypto::base64_encode(&ciphertext),
        "iv": crate::crypto::base64_encode(&iv),
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

pub fn unwrap_raw_key(wrapper_json: &str, wrapping_key: &[u8]) -> Result<Vec<u8>, String> {
    if wrapping_key.len() != 32 {
        return Err("Wrapping key must be 32 bytes".to_string());
    }
    let parsed: serde_json::Value =
        serde_json::from_str(wrapper_json).map_err(|e| e.to_string())?;
    let ciphertext_b64 = parsed["ciphertext"]
        .as_str()
        .ok_or("Missing ciphertext in wrapper")?;
    let iv_b64 = parsed["iv"].as_str().ok_or("Missing iv in wrapper")?;
    let ciphertext = crate::crypto::base64_decode(ciphertext_b64)?;
    let iv = crate::crypto::base64_decode(iv_b64)?;
    crate::aead::aes_gcm_decrypt(&ciphertext, wrapping_key, &iv).map_err(|e| e.to_string())
}

pub fn derive_master_key(password: &str, salt: &[u8], is_mobile: bool) -> Vec<u8> {
    let (iterations, memory, parallelism) = if is_mobile {
        (3, 65536, 4)
    } else {
        (19, 131072, 4)
    };
    crate::kdf::derive_key(password.as_bytes(), salt, iterations, memory, parallelism, 32)
}

pub fn generate_vault_key() -> Vec<u8> {
    crate::crypto::random_bytes(32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_recovery_codes_count() {
        let codes = generate_recovery_codes();
        assert_eq!(codes.len(), 10);
        assert!(codes[0].starts_with("CRYTO-01-"));
    }

    #[test]
    fn test_parse_code_index() {
        assert_eq!(parse_code_index("CRYTO-05-ABCD-EFGH-IJKL").unwrap(), "05");
        assert!(parse_code_index("invalid").is_none());
    }

    #[test]
    fn test_wrap_unwrap_key() {
        let raw_key = [0xABu8; 32];
        let wrapping_key = [0x42u8; 32];
        let wrapped = wrap_raw_key(&raw_key, &wrapping_key).unwrap();
        let unwrapped = unwrap_raw_key(&wrapped, &wrapping_key).unwrap();
        assert_eq!(unwrapped, raw_key);
    }

    #[test]
    fn test_wrap_wrong_key() {
        let raw_key = [0xABu8; 32];
        let wrapping_key = [0x42u8; 32];
        let wrong_key = [0x00u8; 32];
        let wrapped = wrap_raw_key(&raw_key, &wrapping_key).unwrap();
        let result = unwrap_raw_key(&wrapped, &wrong_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_derive_master_key_deterministic() {
        // codeql[cpp/hardcoded-credentials]
        let salt = [0xABu8; 16];
        // codeql[cpp/hardcoded-credentials]
        let key1 = derive_master_key("password", &salt, false);
        // codeql[cpp/hardcoded-credentials]
        let key2 = derive_master_key("password", &salt, false);
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }

    #[test]
    fn test_derive_master_key_mobile() {
        // codeql[cpp/hardcoded-credentials]
        let salt = [0xABu8; 16];
        // codeql[cpp/hardcoded-credentials]
        let desktop = derive_master_key("password", &salt, false);
        // codeql[cpp/hardcoded-credentials]
        let mobile = derive_master_key("password", &salt, true);
        assert_ne!(desktop, mobile);
    }

    #[test]
    fn test_generate_vault_key_length() {
        let key = generate_vault_key();
        assert_eq!(key.len(), 32);
    }
}
