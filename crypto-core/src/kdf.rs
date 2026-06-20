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

