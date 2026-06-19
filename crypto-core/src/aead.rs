use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Invalid key length: expected {0}, got {1}")]
    InvalidKeyLength(usize, usize),
    #[error("Invalid nonce length: expected {0}, got {1}")]
    InvalidNonceLength(usize, usize),
    #[error("Decryption failed")]
    DecryptionFailed,
    #[error("Encryption failed")]
    EncryptionFailed,
}

pub fn aes_gcm_encrypt(plaintext: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if key.len() != 32 {
        return Err(CryptoError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 12 {
        return Err(CryptoError::InvalidNonceLength(12, nonce.len()));
    }

    let key_bytes = aes_gcm::Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(key_bytes);
    let nonce_bytes = Nonce::from_slice(nonce);

    cipher
        .encrypt(nonce_bytes, plaintext)
        .map_err(|_| CryptoError::EncryptionFailed)
}

pub fn aes_gcm_decrypt(ciphertext: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if key.len() != 32 {
        return Err(CryptoError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 12 {
        return Err(CryptoError::InvalidNonceLength(12, nonce.len()));
    }

    let key_bytes = aes_gcm::Key::<Aes256Gcm>::from_slice(key);
    let cipher = Aes256Gcm::new(key_bytes);
    let nonce_bytes = Nonce::from_slice(nonce);

    cipher
        .decrypt(nonce_bytes, ciphertext)
        .map_err(|_| CryptoError::DecryptionFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aes_gcm_roundtrip() {
        let key = [0x42u8; 32];
        // codeql[rust/hard-coded-cryptographic-value]
        let nonce = [0x24u8; 12];
        let plaintext = b"Hello, Rust crypto!";

        let ct = aes_gcm_encrypt(plaintext, &key, &nonce).unwrap();
        assert_ne!(ct, plaintext);

        let pt = aes_gcm_decrypt(&ct, &key, &nonce).unwrap();
        assert_eq!(pt, plaintext);
    }

    #[test]
    fn test_aes_gcm_wrong_key() {
        let key = [0x42u8; 32];
        let wrong_key = [0x00u8; 32];
        // codeql[rust/hard-coded-cryptographic-value]
        let nonce = [0x24u8; 12];
        let plaintext = b"secret";

        let ct = aes_gcm_encrypt(plaintext, &key, &nonce).unwrap();
        let result = aes_gcm_decrypt(&ct, &wrong_key, &nonce);
        assert!(result.is_err());
    }

    #[test]
    fn test_aes_gcm_invalid_key_length() {
        let key = [0u8; 16];
        // codeql[rust/hard-coded-cryptographic-value]
        let nonce = [0u8; 12];
        let result = aes_gcm_encrypt(b"data", &key, &nonce);
        assert!(result.is_err());
    }
}
