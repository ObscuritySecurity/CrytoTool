use crate::kdf;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use thiserror::Error;

const CHUNK_SIZE: usize = 4 * 1024 * 1024;
const HEADER_MAGIC: &str = "CRYTO_STREAM";
const HEADER_VERSION: u8 = 1;

#[derive(Error, Debug)]
pub enum StreamError {
    #[error("Invalid header magic")]
    InvalidMagic,
    #[error("Invalid header version: expected {0}, got {1}")]
    InvalidVersion(u8, u8),
    #[error("Corrupt stream: insufficient data")]
    InsufficientData,
    #[error("Corrupt stream: chunk exceeds bounds")]
    ChunkOutOfBounds,
    #[error("Decryption failed")]
    DecryptionFailed,
    #[error("Encryption failed")]
    EncryptionFailed,
}

fn derive_chunk_iv(base_iv: &[u8], chunk_index: u32) -> [u8; 12] {
    let mut mac = <Hmac::<Sha256> as Mac>::new_from_slice(base_iv)
        .expect("HMAC key length is valid");
    mac.update(b"chunk-iv-");
    let index_bytes = chunk_index.to_le_bytes();
    mac.update(&index_bytes);

    let result = mac.finalize().into_bytes();
    let mut iv = [0u8; 12];
    iv.copy_from_slice(&result[..12]);
    iv
}

pub struct StreamHeader {
    pub magic: String,
    pub version: u8,
    pub algorithm: String,
    pub chunk_size: u32,
    pub total_chunks: u32,
    pub original_size: u64,
    pub salt: [u8; 16],
    pub base_iv: [u8; 12],
}

fn encode_header(header: &StreamHeader) -> Vec<u8> {
    let magic_bytes = header.magic.as_bytes();
    let algo_bytes = header.algorithm.as_bytes();
    let size = 1 + magic_bytes.len() + 1 + 1 + algo_bytes.len() + 4 + 4 + 8 + 16 + 12;
    let mut buf = Vec::with_capacity(size);

    buf.push(magic_bytes.len() as u8);
    buf.extend_from_slice(magic_bytes);
    buf.push(header.version);
    buf.push(algo_bytes.len() as u8);
    buf.extend_from_slice(algo_bytes);
    buf.extend_from_slice(&header.chunk_size.to_le_bytes());
    buf.extend_from_slice(&header.total_chunks.to_le_bytes());
    buf.extend_from_slice(&header.original_size.to_le_bytes());
    buf.extend_from_slice(&header.salt);
    buf.extend_from_slice(&header.base_iv);

    buf
}

fn decode_header(data: &[u8]) -> Result<(StreamHeader, usize), StreamError> {
    let mut offset = 0;

    let magic_len = data[offset] as usize;
    offset += 1;
    if offset + magic_len > data.len() {
        return Err(StreamError::InsufficientData);
    }
    let magic = String::from_utf8_lossy(&data[offset..offset + magic_len]).to_string();
    offset += magic_len;

    if magic != HEADER_MAGIC {
        return Err(StreamError::InvalidMagic);
    }

    let version = data[offset];
    offset += 1;
    if version != HEADER_VERSION {
        return Err(StreamError::InvalidVersion(HEADER_VERSION, version));
    }

    let algo_len = data[offset] as usize;
    offset += 1;
    if offset + algo_len > data.len() {
        return Err(StreamError::InsufficientData);
    }
    let algorithm = String::from_utf8_lossy(&data[offset..offset + algo_len]).to_string();
    offset += algo_len;

    if offset + 4 + 4 + 8 + 16 + 12 > data.len() {
        return Err(StreamError::InsufficientData);
    }

    let chunk_size = u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
    offset += 4;

    let total_chunks = u32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
    offset += 4;

    let original_size = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
    offset += 8;

    let salt: [u8; 16] = (&data[offset..offset + 16]).try_into().map_err(|_| StreamError::InsufficientData)?;
    offset += 16;

    let base_iv: [u8; 12] = (&data[offset..offset + 12]).try_into().map_err(|_| StreamError::InsufficientData)?;
    offset += 12;

    let header = StreamHeader {
        magic,
        version,
        algorithm,
        chunk_size,
        total_chunks,
        original_size,
        salt,
        base_iv,
    };

    let header_size = offset;
    Ok((header, header_size))
}

pub fn stream_encrypt(
    data: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, StreamError> {
    let salt: [u8; 16] = rand::random();
    let base_iv: [u8; 12] = rand::random();

    let key = kdf::derive_key(
        passphrase.as_bytes(),
        &salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );

    let total_chunks = if data.is_empty() {
        0
    } else {
        ((data.len() - 1) / CHUNK_SIZE) as u32 + 1
    };

    let header = StreamHeader {
        magic: HEADER_MAGIC.to_string(),
        version: HEADER_VERSION,
        algorithm: "AES-GCM-Stream".to_string(),
        chunk_size: CHUNK_SIZE as u32,
        total_chunks,
        original_size: data.len() as u64,
        salt,
        base_iv,
    };

    let header_enc = encode_header(&header);
    let mut result = header_enc;

    for i in 0..total_chunks {
        let start = (i as usize) * CHUNK_SIZE;
        let end = std::cmp::min(start + CHUNK_SIZE, data.len());
        let chunk_data = &data[start..end];

        let chunk_iv = derive_chunk_iv(&base_iv, i);

        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| StreamError::EncryptionFailed)?;
        let encrypted = cipher
            .encrypt(Nonce::from_slice(&chunk_iv), chunk_data)
            .map_err(|_| StreamError::EncryptionFailed)?;

        result.extend_from_slice(&encrypted);
    }

    Ok(result)
}

pub fn stream_decrypt(
    encrypted_data: &[u8],
    passphrase: &str,
    argon_iterations: u32,
    argon_memory_kib: u32,
    argon_parallelism: u32,
) -> Result<Vec<u8>, StreamError> {
    let (header, header_size) = decode_header(encrypted_data)?;

    let key = kdf::derive_key(
        passphrase.as_bytes(),
        &header.salt,
        argon_iterations,
        argon_memory_kib,
        argon_parallelism,
        32,
    );

    let mut decrypted_chunks: Vec<Vec<u8>> = Vec::new();
    let mut offset = header_size;

    for i in 0..header.total_chunks {
        let chunk_iv = derive_chunk_iv(&header.base_iv, i);

        let remaining = encrypted_data.len() - offset;
        if remaining < 16 {
            return Err(StreamError::InsufficientData);
        }

        let chunk_size = if i < header.total_chunks - 1 {
            // Non-final chunks are exactly chunk_size + 16 (GCM tag)
            (header.chunk_size as usize) + 16
        } else {
            remaining
        };

        if offset + chunk_size > encrypted_data.len() {
            return Err(StreamError::ChunkOutOfBounds);
        }

        let chunk_cipher = &encrypted_data[offset..offset + chunk_size];
        offset += chunk_size;

        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| StreamError::DecryptionFailed)?;
        let decrypted = cipher
            .decrypt(Nonce::from_slice(&chunk_iv), chunk_cipher)
            .map_err(|_| StreamError::DecryptionFailed)?;

        decrypted_chunks.push(decrypted);
    }

    // Calculate total plaintext size
    let total_size = decrypted_chunks.iter().map(|c| c.len()).sum();
    let mut result = Vec::with_capacity(total_size);
    for chunk in decrypted_chunks {
        result.extend_from_slice(&chunk);
    }

    // Trim to original size (in case of padding)
    result.truncate(header.original_size as usize);

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_roundtrip_small() {
        let data = b"Hello streaming AES-GCM!";
        // codeql[rust/hard-coded-cryptographic-value]
        let passphrase = "test-passphrase-123";

        let ct = stream_encrypt(data, passphrase, 3, 65536, 4).unwrap();
        assert!(ct.len() > data.len());

        let pt = stream_decrypt(&ct, passphrase, 3, 65536, 4).unwrap();
        assert_eq!(pt, data);
    }

    #[test]
    fn test_stream_roundtrip_large() {
        // 5 MB of data (spans multiple chunks)
        let data = vec![0xABu8; 5 * 1024 * 1024];
        // codeql[rust/hard-coded-cryptographic-value]
        let passphrase = "strong-passphrase";

        let ct = stream_encrypt(&data, passphrase, 3, 65536, 4).unwrap();
        let pt = stream_decrypt(&ct, passphrase, 3, 65536, 4).unwrap();
        assert_eq!(pt, data);
    }

    #[test]
    fn test_stream_wrong_passphrase() {
        let data = b"secret data";
        // codeql[rust/hard-coded-cryptographic-value]
        let ct = stream_encrypt(data, "correct-pass", 3, 65536, 4).unwrap();
        // codeql[rust/hard-coded-cryptographic-value]
        let result = stream_decrypt(&ct, "wrong-pass", 3, 65536, 4);
        assert!(result.is_err());
    }

    #[test]
    fn test_stream_empty() {
        let data = b"";
        // codeql[rust/hard-coded-cryptographic-value]
        let passphrase = "test";

        let ct = stream_encrypt(data, passphrase, 3, 65536, 4).unwrap();
        let pt = stream_decrypt(&ct, passphrase, 3, 65536, 4).unwrap();
        assert_eq!(pt, data);
    }

    #[test]
    fn test_stream_exact_chunk() {
        // Exactly one chunk size
        let data = vec![0x42u8; CHUNK_SIZE];
        // codeql[rust/hard-coded-cryptographic-value]
        let passphrase = "exact-chunk";

        let ct = stream_encrypt(&data, passphrase, 3, 65536, 4).unwrap();
        let pt = stream_decrypt(&ct, passphrase, 3, 65536, 4).unwrap();
        assert_eq!(pt, data);
    }
}
