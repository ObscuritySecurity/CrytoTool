use aes::cipher::{KeyIvInit, StreamCipher};
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AesCtrError {
    #[error("Invalid key length: expected {0}, got {1}")]
    InvalidKeyLength(usize, usize),
    #[error("Invalid nonce length: expected {0}, got {1}")]
    InvalidNonceLength(usize, usize),
    #[error("Ciphertext too short (missing HMAC tag)")]
    CiphertextTooShort,
    #[error("HMAC tag mismatch — data integrity check failed")]
    TagMismatch,
}

type Aes256Ctr = ctr::Ctr64LE<aes::Aes256>;

/// Encrypt-then-MAC with HKDF subkey derivation.
/// Output format: `[ciphertext || 32-byte HMAC-SHA256 tag]`
pub fn encrypt(plaintext: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, AesCtrError> {
    if key.len() != 32 {
        return Err(AesCtrError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 16 {
        return Err(AesCtrError::InvalidNonceLength(16, nonce.len()));
    }

    let (enc_key, mac_key) = split_key(key);

    let mut ciphertext = plaintext.to_vec();
    let mut cipher = Aes256Ctr::new(enc_key.as_slice().into(), nonce.into());
    cipher.apply_keystream(&mut ciphertext);

    let tag = hmac_sha256(&mac_key, &ciphertext);

    let mut result = ciphertext;
    result.extend_from_slice(&tag);
    Ok(result)
}

/// Decrypt-then-verify. Input: `[ciphertext || 32-byte HMAC tag]`
pub fn decrypt(data: &[u8], key: &[u8], nonce: &[u8]) -> Result<Vec<u8>, AesCtrError> {
    if key.len() != 32 {
        return Err(AesCtrError::InvalidKeyLength(32, key.len()));
    }
    if nonce.len() != 16 {
        return Err(AesCtrError::InvalidNonceLength(16, nonce.len()));
    }
    if data.len() < 32 {
        return Err(AesCtrError::CiphertextTooShort);
    }

    let (enc_key, mac_key) = split_key(key);

    let ciphertext_len = data.len() - 32;
    let ciphertext = &data[..ciphertext_len];
    let expected_tag = &data[ciphertext_len..];

    let computed_tag = hmac_sha256(&mac_key, ciphertext);

    use subtle::ConstantTimeEq;

    if computed_tag.ct_eq(expected_tag).unwrap_u8() != 1
    {
        return Err(AesCtrError::TagMismatch);
    }

    let mut plaintext = ciphertext.to_vec();
    let mut cipher = Aes256Ctr::new(enc_key.as_slice().into(), nonce.into());
    cipher.apply_keystream(&mut plaintext);

    Ok(plaintext)
}

fn split_key(master_key: &[u8]) -> ([u8; 32], [u8; 32]) {
    let hkdf = Hkdf::<Sha256>::new(None, master_key);
    let mut out = [0u8; 64];
    hkdf.expand(b"aes-ctr-enc-mac", &mut out)
        .expect("HKDF expand failed");

    let mut enc_key = [0u8; 32];
    let mut mac_key = [0u8; 32];
    enc_key.copy_from_slice(&out[..32]);
    mac_key.copy_from_slice(&out[32..]);
    (enc_key, mac_key)
}

fn hmac_sha256(key: &[u8; 32], data: &[u8]) -> [u8; 32] {
    let mut mac =
        Hmac::<Sha256>::new_from_slice(key).expect("HMAC key length is valid");
    mac.update(data);
    let result = mac.finalize();
    result.into_bytes().into()
}

