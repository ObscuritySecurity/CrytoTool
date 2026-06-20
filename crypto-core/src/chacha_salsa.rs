use thiserror::Error;

#[derive(Error, Debug)]
pub enum ChaChaError {
    #[error("Invalid key length: expected {0}, got {1}")]
    InvalidKeyLength(usize, usize),
    #[error("Invalid nonce length: expected {0}, got {1}")]
    InvalidNonceLength(usize, usize),
    #[error("Encryption failed")]
    EncryptionFailed,
    #[error("Decryption failed")]
    DecryptionFailed,
}

// ─── ChaCha20-Poly1305 (IETF, RFC 8439, 12-byte nonce) ───

pub fn chacha20_poly1305_encrypt(
    plaintext: &[u8],
    key: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, ChaChaError> {
    use chacha20poly1305::aead::{Aead, KeyInit};
    use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};

    if key.len() != 32 {
        return Err(ChaChaError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 12 {
        return Err(ChaChaError::InvalidNonceLength(12, nonce.len()));
    }

    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    cipher
        .encrypt(Nonce::from_slice(nonce), plaintext)
        .map_err(|_| ChaChaError::EncryptionFailed)
}

pub fn chacha20_poly1305_decrypt(
    ciphertext: &[u8],
    key: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, ChaChaError> {
    use chacha20poly1305::aead::{Aead, KeyInit};
    use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};

    if key.len() != 32 {
        return Err(ChaChaError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 12 {
        return Err(ChaChaError::InvalidNonceLength(12, nonce.len()));
    }

    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    cipher
        .decrypt(Nonce::from_slice(nonce), ciphertext)
        .map_err(|_| ChaChaError::DecryptionFailed)
}

// ─── XChaCha20-Poly1305 (24-byte nonce) ───

pub fn xchacha20_poly1305_encrypt(
    plaintext: &[u8],
    key: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, ChaChaError> {
    use chacha20poly1305::aead::{Aead, KeyInit};
    use chacha20poly1305::{Key, XChaCha20Poly1305, XNonce};
    if key.len() != 32 {
        return Err(ChaChaError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 24 {
        return Err(ChaChaError::InvalidNonceLength(24, nonce.len()));
    }

    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    cipher
        .encrypt(XNonce::from_slice(nonce), plaintext)
        .map_err(|_| ChaChaError::EncryptionFailed)
}

pub fn xchacha20_poly1305_decrypt(
    ciphertext: &[u8],
    key: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, ChaChaError> {
    use chacha20poly1305::aead::{Aead, KeyInit};
    use chacha20poly1305::{Key, XChaCha20Poly1305, XNonce};
    if key.len() != 32 {
        return Err(ChaChaError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 24 {
        return Err(ChaChaError::InvalidNonceLength(24, nonce.len()));
    }

    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    cipher
        .decrypt(XNonce::from_slice(nonce), ciphertext)
        .map_err(|_| ChaChaError::DecryptionFailed)
}

// ─── Salsa20-Poly1305 (XSalsa20+Poly1305, libsodium crypto_secretbox, 24-byte nonce) ───

pub fn salsa20_poly1305_encrypt(
    plaintext: &[u8],
    key: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, ChaChaError> {
    use xsalsa20poly1305::aead::{Aead, KeyInit};
    use xsalsa20poly1305::{Key, Nonce, XSalsa20Poly1305};

    if key.len() != 32 {
        return Err(ChaChaError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 24 {
        return Err(ChaChaError::InvalidNonceLength(24, nonce.len()));
    }

    let cipher = XSalsa20Poly1305::new(Key::from_slice(key));
    cipher
        .encrypt(Nonce::from_slice(nonce), plaintext)
        .map_err(|_| ChaChaError::EncryptionFailed)
}

pub fn salsa20_poly1305_decrypt(
    ciphertext: &[u8],
    key: &[u8],
    nonce: &[u8],
) -> Result<Vec<u8>, ChaChaError> {
    use xsalsa20poly1305::aead::{Aead, KeyInit};
    use xsalsa20poly1305::{Key, Nonce, XSalsa20Poly1305};

    if key.len() != 32 {
        return Err(ChaChaError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 24 {
        return Err(ChaChaError::InvalidNonceLength(24, nonce.len()));
    }

    let cipher = XSalsa20Poly1305::new(Key::from_slice(key));
    cipher
        .decrypt(Nonce::from_slice(nonce), ciphertext)
        .map_err(|_| ChaChaError::DecryptionFailed)
}

