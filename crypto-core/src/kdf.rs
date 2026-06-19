use argon2::{Algorithm, Argon2, Params, Version};

pub fn derive_key(
    password: &[u8],
    salt: &[u8],
    iterations: u32,
    memory_size_kib: u32,
    parallelism: u32,
    output_length: usize,
) -> Vec<u8> {
    let params = Params::new(
        memory_size_kib,
        iterations,
        parallelism,
        Some(output_length),
    )
    .expect("Invalid Argon2 parameters");

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = vec![0u8; output_length];
    argon2
        .hash_password_into(password, salt, &mut key)
        .expect("Argon2id hashing failed");

    key
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_deterministic() {
        // codeql[rust/hard-coded-cryptographic-value]
        let password = b"correct horse battery staple";
        // codeql[rust/hard-coded-cryptographic-value]
        let salt = [0xABu8; 16];
        let key1 = derive_key(password, &salt, 3, 65536, 4, 32);
        let key2 = derive_key(password, &salt, 3, 65536, 4, 32);
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_derive_key_different_salt() {
        // codeql[rust/hard-coded-cryptographic-value]
        let password = b"same password";
        // codeql[rust/hard-coded-cryptographic-value]
        let salt1 = [0x01u8; 16];
        // codeql[rust/hard-coded-cryptographic-value]
        let salt2 = [0x02u8; 16];
        let key1 = derive_key(password, &salt1, 3, 65536, 4, 32);
        let key2 = derive_key(password, &salt2, 3, 65536, 4, 32);
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_derive_key_output_length() {
        // codeql[rust/hard-coded-cryptographic-value]
        let password = b"test";
        // codeql[rust/hard-coded-cryptographic-value]
        let salt = [0xBBu8; 16];
        let key = derive_key(password, &salt, 3, 65536, 4, 32);
        assert_eq!(key.len(), 32);
    }
}
