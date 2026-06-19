#![no_main]

use libfuzzer_sys::fuzz_target;
use crypto_core::aead::{aes_gcm_encrypt, aes_gcm_decrypt};

fuzz_target!(|data: &[u8]| {
    if data.len() < 44 {
        return;
    }

    let key = &data[..32];
    let nonce = &data[32..44];
    let plaintext = &data[44..];

    let ct = match aes_gcm_encrypt(plaintext, key, nonce) {
        Ok(c) => c,
        Err(_) => return,
    };

    let pt = match aes_gcm_decrypt(&ct, key, nonce) {
        Ok(p) => p,
        Err(_) => return,
    };

    assert_eq!(pt, plaintext);
});
