# crypto-core

Rust crypto primitives for Privon Vault — portable to WASM (browser) and native (Tauri).

## Status

| Target | Status |
|--------|--------|
| Native (linux x86_64) | ✅ `cargo test` — 9/9 pass |
| WASM (browser) | ⚠️ needs `rustup target add wasm32-unknown-unknown` |
| Tauri plugin | 🔜 planned |

## Build & Test

```bash
cargo test                    # native tests
wasm-pack build --target web  # browser WASM (needs rustup)
```

## Implemented

- `kdf::derive_key()` — Argon2id (params per threat model tier)
- `aead::aes_gcm_encrypt/decrypt()` — AES-256-GCM (12-byte nonce)
- `aes_ctr::encrypt/decrypt()` — AES-CTR + HKDF-SHA256 subkey split + HMAC-SHA256 Encrypt-then-MAC

## Usage (WASM)

```typescript
import init, { derive_key, aes_gcm_encrypt, aes_gcm_decrypt } from 'crypto-core';

await init();
const key = derive_key(password, salt, 3, 65536, 1, 32); // params per tier (aici tier 2)
const ct = aes_gcm_encrypt(plaintext, key, nonce);
const pt = aes_gcm_decrypt(ct, key, nonce);
```
