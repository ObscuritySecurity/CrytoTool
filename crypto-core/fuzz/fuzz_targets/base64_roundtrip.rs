#![no_main]

use libfuzzer_sys::fuzz_target;
use crypto_core::crypto::{base64_encode, base64_decode};

fuzz_target!(|data: &[u8]| {
    let encoded = base64_encode(data);
    let decoded = match base64_decode(&encoded) {
        Ok(d) => d,
        Err(_) => return,
    };

    assert_eq!(decoded, data);
});
