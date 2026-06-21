# CrytoTool API Documentation
_Version: 2.5.0-beta | Last Updated: 2026-06-21_

All cryptographic APIs are implemented in a Rust crate (`crypto-core/`) compiled to WASM. The JS bridge is `crypto-core/index.ts`.

---

## Table of Contents
1. [Initialization](#1-initialization)
2. [Key Derivation](#2-key-derivation)
3. [Encryption / Decryption](#3-encryption--decryption)
4. [Streaming Encryption](#4-streaming-encryption)
5. [Backup & Recovery](#5-backup--recovery)
6. [Metadata](#6-metadata)
7. [Vault Storage](#7-vault-storage)
8. [Security Utilities](#8-security-utilities)
9. [Sanitization](#9-sanitization)
10. [Type Definitions](#10-type-definitions)

---

## 1. Initialization

### `ensureInit()`
Initializes the WASM module. Must be called before any other function (automatically handled by async wrappers).

```typescript
import { ensureInit } from './crypto-core/index';
await ensureInit();
```

All async functions (marked with `async`) call `ensureInit()` internally. Sync functions assume WASM is already loaded.

---

## 2. Key Derivation

### `derive_key(password, salt, iterations, memorySizeKib, parallelism, outputLength)`
Argon2id key derivation.

```typescript
import { derive_key } from './crypto-core/index';
const key = derive_key(
  new TextEncoder().encode(password),
  salt,
  19,       // iterations
  131072,   // memory (KB)
  4,        // parallelism
  32        // output length
); // returns Uint8Array
```

### `derive_master_key(password, salt, isMobile)`
Convenience wrapper calling `derive_key` with parameters from threat model.

```typescript
const masterKey = derive_master_key('MyPassword123!', salt, false);
```

### `get_argon_params(purpose, tier)`
Returns Argon2id parameters for a given purpose (`'master'`, `'pin'`, `'recovery'`) and tier (`1`-`4`).

```typescript
const params = JSON.parse(get_argon_params('master', 1));
// { iterations: 19, memorySize: 131072, parallelism: 4 }
```

---

## 3. Encryption / Decryption

All encrypt/decrypt functions are **synchronous** (pure WASM, no JS promises).

### `encrypt(data, key)`
Default vault encryption: AES-256-GCM with random 12-byte IV.

```typescript
import { encrypt, decrypt, base64_decode } from './crypto-core/index';
const encryptedJson = encrypt(fileBytes, vaultKey);
const parsed = JSON.parse(encryptedJson);
// { ciphertext: "...", iv: "..." }
const plaintext = decrypt(parsed.ciphertext, parsed.iv, vaultKey);
```

### `encrypt_string(data, key) / decrypt_string(ciphertextB64, ivB64, key)`
String encryption for localStorage.

```typescript
const enc = encrypt_string('my-secret-value', vaultKey);
// Returns: { ciphertext: "base64...", iv: "base64..." }
const dec = decrypt_string(enc.ciphertext, enc.iv, vaultKey);
```

### `encrypt_with_passphrase(data, passphrase, algorithm, argonIterations, argonMemoryKib, argonParallelism)`
Manual encryption with any of the 6 supported algorithms.

```typescript
const result = encrypt_with_passphrase(
  fileBytes,
  'MY-SECRET-KEY',
  'XChaCha20-Poly1305',
  4, 131072, 4
); // Returns: JSON string with ciphertext, iv, salt, algorithm
```

### `decrypt_with_passphrase(data, passphrase, iv, salt, algorithm, argonIterations, argonMemoryKib, argonParallelism)`

### Supported Algorithms
```typescript
type CryptoAlgorithm =
  | 'AES-GCM'
  | 'AES-CTR'
  | 'ChaCha20-Poly1305'
  | 'XChaCha20-Poly1305'
  | 'Salsa20-Poly1305'
  | 'AES-GCM-Stream';
```

### `random_bytes(count)`
```typescript
const salt = random_bytes(16);
const iv = random_bytes(12);
```

### `base64_encode(data) / base64_decode(encoded)`
```typescript
const b64 = base64_encode(salt);     // string
const raw = base64_decode(b64);      // Uint8Array
```

### `generate_vault_key()`
Generates a 32-byte random key.

---

## 4. Streaming Encryption

### `stream_encrypt(data, passphrase, argonIterations, argonMemoryKib, argonParallelism)`
4MB chunked encryption. Returns header + encrypted chunks.

```typescript
const encrypted = stream_encrypt(largeFileBytes, 'STREAM-KEY', 4, 131072, 4);
```

### `stream_decrypt(encryptedData, passphrase, argonIterations, argonMemoryKib, argonParallelism)`

### Stream Header Format
```
Magic: 'CRYTO_STREAM' (12 bytes)
Version: 1 (4 bytes)
Algorithm: 'AES-GCM-Stream'
ChunkSize: 4194304 (4MB)
TotalChunks: number
OriginalSize: number
Salt: 16 bytes
BaseIV: 12 bytes
```

---

## 5. Backup & Recovery

### `generate_passphrase()`
Generates 26-character backup key (130 bits entropy).

```typescript
const key = generate_passphrase();
// "X9F2-KLP0-ABCD-EFGH-IJKL-MNOP-QRST-UVWX"
```

Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars).

### `backup_encrypt(plaintext, passphrase, argonIterations, argonMemoryKib, argonParallelism)`
Encrypts backup data. Returns `Uint8Array`:

```typescript
const backup = backup_encrypt(
  new TextEncoder().encode(JSON.stringify(backupData)),
  passphrase,
  19, 131072, 4
);
// Format: [16B salt][12B IV][ciphertext + 16B GCM tag]
```

### `backup_decrypt(data, passphrase, argonIterations, argonMemoryKib, argonParallelism)`

### `generate_recovery_codes()`
Generates 10 recovery codes.

```typescript
const codes = generate_recovery_codes();
// ["CRYTO-01-XXXX-XXXX-XXXX", ..., "CRYTO-10-XXXX-XXXX-XXXX"]
```

### `parse_code_index(code)`
Returns `"01"`–`"10"` or `null` if invalid format.

```typescript
const idx = parse_code_index('CRYTO-03-ABCD-EFGH-IJKL');
// "03"
```

### `wrap_raw_key(rawKey, wrappingKey) / unwrap_raw_key(wrapperJson, wrappingKey)`
Master key wrapping with AES-GCM.

```typescript
const wrapper = wrap_raw_key(mvkBytes, masterKey);  // JSON string
const mvk = unwrap_raw_key(wrapper, masterKey);      // Uint8Array
```

---

## 6. Metadata

### `metadata_encrypt(metaJson, key)`
Encrypts metadata (name, tags, artist, album, etc.).

```typescript
const encrypted = metadata_encrypt(
  JSON.stringify({ name: 'document.pdf', tags: [...] }),
  vaultKey
);
// Returns: JSON string of { ciphertext: "...", iv: "..." }
```

### `metadata_decrypt(encryptedJson, key)`
Returns decrypted JSON string.

---

## 7. Vault Storage

### `vault_encrypt_keys(keysJson, key) / vault_decrypt_keys(encryptedJson, key)`
Encrypts/decrypts vault key entries for localStorage storage.

```typescript
const encrypted = vault_encrypt_keys(
  JSON.stringify([{ name: 'My Key', key: 'ABCD-...' }]),
  vaultKey
);
```

---

## 8. Security Utilities

### `validate_pin(pin)`
Validates a 6-digit PIN (throws on invalid).

```typescript
validate_pin('123456');  // throws: common PIN blacklist
validate_pin('837291');  // OK
```

### `pin_hash(pin, argonIterations, argonMemoryKib, argonParallelism)`
Hashes a PIN with Argon2id + AES-GCM.

```typescript
const hash = pin_hash('837291', 2, 32768, 4);
// Returns: JSON string for localStorage
```

### `pin_verify(pin, storedJson, argonIterations, argonMemoryKib, argonParallelism)`
```typescript
const valid = pin_verify('837291', storedHash, 2, 32768, 4);
```

### `get_backoff_time(attempts)`
Exponential backoff: `min(pow(2, attempts-1), 3600)` seconds.

```typescript
const seconds = get_backoff_time(3); // 4 seconds
```

---

## 9. Sanitization

### `is_safe_image_url(url)`
Checks if URL is safe for embedding (HTTPS, data URIs, blob URIs, relative paths).

### `sanitize_url(url, fallback)`
Sanitizes a URL; returns fallback on unsafe.

### `escape_html(text)`
HTML-entity encodes a string.

### `safe_mime_type_for_ext(ext)`
Returns safe MIME type for file extension (blocks svg, html).

---

## 10. Type Definitions

```typescript
type CryptoAlgorithm =
  | 'AES-GCM'
  | 'AES-CTR'
  | 'ChaCha20-Poly1305'
  | 'XChaCha20-Poly1305'
  | 'Salsa20-Poly1305'
  | 'AES-GCM-Stream';

interface DBItem {
  id: string;
  parentId: string | null;
  type: 'file' | 'folder' | 'system';
  name: string;
  size?: string;
  date: string;
  fileData?: Blob;
  iv?: string;
  salt?: string;
  algorithm?: CryptoAlgorithm;
  isEncrypted?: boolean;
  category?: 'image' | 'video' | 'audio' | 'doc' | 'other';
  isTrashed?: boolean;
  isFavorite?: boolean;
  tags?: Tag[];
  encryptedMeta?: EncryptedMeta;
  artist?: string;
  album?: string;
  coverUrl?: string;
}

interface EncryptedMeta {
  ciphertext: string;  // base64
  iv: string;          // base64
}
```

---

## Important Notes

1. **All crypto runs in WASM** — compiled from Rust `crypto-core/` crate. Functions are synchronous after WASM init.
2. **Vault Key is private** — held as `Uint8Array` in `crypto-core/db.ts` module scope (`setVaultKey`/`getVaultKey`).
3. **No server involved** — 100% client-side.
4. **Error handling** — Crypto functions throw on invalid keys, corrupted data, or wrong algorithms.
