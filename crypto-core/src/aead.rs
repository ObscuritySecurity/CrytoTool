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

