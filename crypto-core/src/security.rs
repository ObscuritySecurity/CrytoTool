use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

const COMMON_PINS: &[&str] = &[
    "000000", "111111", "222222", "333333", "444444",
    "555555", "666666", "777777", "888888", "999999",
    "123456", "654321", "112233", "121212", "123123",
    "1234567890", "012345", "123450", "0000000000",
];

pub fn validate_pin(pin: &str) -> Result<(), String> {
    if pin.len() != 6 {
        return Err("PIN must be exactly 6 digits.".to_string());
    }
    if !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must contain only digits.".to_string());
    }
    if COMMON_PINS.contains(&pin) {
        return Err("This PIN is too common. Please choose a different one.".to_string());
    }
    Ok(())
}

pub fn get_backoff_time(attempts: u32) -> u64 {
    if attempts == 0 {
        return 0;
    }
    let seconds = 2u64.pow(attempts.saturating_sub(1).min(16));
    seconds.min(3600)
}

pub fn pin_hash(
    pin: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<String, String> {
    let pin_salt = crate::crypto::random_bytes(16);
    let pin_key = crate::kdf::derive_key(
        pin.as_bytes(),
        &pin_salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );
    let nonce = crate::crypto::random_bytes(12);
    let plaintext = b"CrytoTool PIN v2";
    let ciphertext =
        crate::aead::aes_gcm_encrypt(plaintext, &pin_key, &nonce).map_err(|e| e.to_string())?;

    let result = serde_json::json!({
        "pinSalt": BASE64.encode(&pin_salt),
        "nonce": BASE64.encode(&nonce),
        "encryptedHash": BASE64.encode(&ciphertext),
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

pub fn pin_verify(
    pin: &str,
    stored_json: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<bool, String> {
    let parsed: serde_json::Value =
        serde_json::from_str(stored_json).map_err(|e| e.to_string())?;
    let pin_salt_b64 = parsed["pinSalt"].as_str().ok_or("Missing pinSalt")?;
    let nonce_b64 = parsed["nonce"].as_str().ok_or("Missing nonce")?;
    let encrypted_hash_b64 = parsed["encryptedHash"]
        .as_str()
        .ok_or("Missing encryptedHash")?;

    let pin_salt = BASE64.decode(pin_salt_b64).map_err(|e| e.to_string())?;
    let nonce = BASE64.decode(nonce_b64).map_err(|e| e.to_string())?;
    let encrypted_hash = BASE64.decode(encrypted_hash_b64).map_err(|e| e.to_string())?;

    let pin_key = crate::kdf::derive_key(
        pin.as_bytes(),
        &pin_salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );

    match crate::aead::aes_gcm_decrypt(&encrypted_hash, &pin_key, &nonce) {
        Ok(plaintext) => {
            let expected = b"CrytoTool PIN v2";
            use subtle::ConstantTimeEq;
            Ok(plaintext.ct_eq(&expected[..]).into())
        }
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pin_hash_verify() {
        // codeql[rust/hard-coded-cryptographic-value]
        let hash = pin_hash("123456", 2, 32768, 4).unwrap();
        assert!(pin_verify("123456", &hash, 2, 32768, 4).unwrap());
        assert!(!pin_verify("000000", &hash, 2, 32768, 4).unwrap());
    }

    #[test]
    fn test_validate_pin_length() {
        assert!(validate_pin("12345").is_err());
        assert!(validate_pin("1234567").is_err());
        assert!(validate_pin("123789").is_ok());
    }

    #[test]
    fn test_validate_pin_non_digit() {
        assert!(validate_pin("12z456").is_err());
        assert!(validate_pin("abcdef").is_err());
    }

    #[test]
    fn test_validate_pin_common() {
        assert!(validate_pin("000000").is_err());
        assert!(validate_pin("123456").is_err());
        assert!(validate_pin("111111").is_err());
    }

    #[test]
    fn test_get_backoff_time_zero() {
        assert_eq!(get_backoff_time(0), 0);
    }

    #[test]
    fn test_get_backoff_time_exponential() {
        assert_eq!(get_backoff_time(1), 1);
        assert_eq!(get_backoff_time(2), 2);
        assert_eq!(get_backoff_time(3), 4);
        assert_eq!(get_backoff_time(4), 8);
        assert_eq!(get_backoff_time(5), 16);
    }

    #[test]
    fn test_get_backoff_time_capped() {
        assert_eq!(get_backoff_time(20), 3600);
        assert_eq!(get_backoff_time(100), 3600);
    }
}
