use rand::RngCore;

const BACKUP_SALT_LEN: usize = 16;
const BACKUP_IV_LEN: usize = 12;

pub fn generate_passphrase() -> String {
    let chars = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let target_len = 26;
    let alphabet_len = chars.len();
    let max_unbiased = (256 / alphabet_len) * alphabet_len;

    let mut result = String::with_capacity(target_len + 6);
    let mut rng = rand::rngs::OsRng;
    let mut generated = 0;

    while generated < target_len {
        let mut buf = [0u8; 32];
        rng.fill_bytes(&mut buf);
        for &val in buf.iter() {
            if generated >= target_len {
                break;
            }
            if (val as usize) >= max_unbiased {
                continue;
            }
            result.push(chars[val as usize % alphabet_len] as char);
            generated += 1;
            if generated % 4 == 0 && generated != target_len {
                result.push('-');
            }
        }
    }
    result
}

pub fn backup_encrypt(
    plaintext: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    let salt = crate::crypto::random_bytes(BACKUP_SALT_LEN);
    let key = crate::kdf::derive_key(
        passphrase.as_bytes(),
        &salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );
    let iv = crate::crypto::random_bytes(BACKUP_IV_LEN);
    let ciphertext =
        crate::aead::aes_gcm_encrypt(plaintext, &key, &iv).map_err(|e| e.to_string())?;

    let mut result = Vec::with_capacity(salt.len() + iv.len() + ciphertext.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&iv);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

pub fn backup_decrypt(
    data: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, String> {
    if data.len() < BACKUP_SALT_LEN + BACKUP_IV_LEN + 16 {
        return Err("File is corrupt or invalid (too short).".to_string());
    }
    let salt = &data[..BACKUP_SALT_LEN];
    let iv = &data[BACKUP_SALT_LEN..BACKUP_SALT_LEN + BACKUP_IV_LEN];
    let ciphertext = &data[BACKUP_SALT_LEN + BACKUP_IV_LEN..];

    let key = crate::kdf::derive_key(
        passphrase.as_bytes(),
        salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );
    crate::aead::aes_gcm_decrypt(ciphertext, &key, iv)
        .map_err(|_| "Invalid passphrase or corrupted backup file.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_passphrase_length() {
        let pp = generate_passphrase();
        assert_eq!(pp.len(), 32); // 26 chars + 6 dashes
    }

    #[test]
    fn test_backup_roundtrip() {
        let data = b"secret backup data";
        // codeql[cpp/hardcoded-credentials]
        let encrypted = backup_encrypt(data, "test-passphrase", 3, 65536, 4).unwrap();
        assert_eq!(encrypted.len(), 16 + 12 + data.len() + 16);
        // codeql[cpp/hardcoded-credentials]
        let decrypted = backup_decrypt(&encrypted, "test-passphrase", 3, 65536, 4).unwrap();
        assert_eq!(decrypted, data);
    }

    #[test]
    fn test_backup_wrong_passphrase() {
        let data = b"secret";
        // codeql[cpp/hardcoded-credentials]
        let encrypted = backup_encrypt(data, "correct", 3, 65536, 4).unwrap();
        // codeql[cpp/hardcoded-credentials]
        let result = backup_decrypt(&encrypted, "wrong", 3, 65536, 4);
        assert!(result.is_err());
    }

    #[test]
    fn test_backup_too_short() {
        // codeql[cpp/hardcoded-credentials]
        let result = backup_decrypt(&[0u8; 10], "p", 3, 65536, 4);
        assert!(result.is_err());
    }
}
