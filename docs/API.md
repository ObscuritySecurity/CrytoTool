# CrytoTool API Documentation
_Version: 2.5.0-PRO | Last Updated: 2026-05-01_

This document describes the public APIs available in CrytoTool for developers who want to understand, extend, or integrate with the crypto services.

**Important**: CrytoTool is 100% client-side. All APIs run in the browser/WebView context. There is no server API.

---

## Table of Contents
1. [Crypto Service](#crypto-service)
2. [Backup Crypto Service](#backup-crypto-service)
3. [Stream Crypto](#stream-crypto)
4. [Vault Storage](#vault-storage)
5. [Database (IndexedDB)](#database-indexeddb)
6. [Security Utilities](#security-utilities)

---

## Crypto Service
_Location: `utils/crypto.ts`_

Central service for all encryption/decryption operations. Uses Web Crypto API and libsodium-wrappers.

### `cryptoService.deriveMasterKey(password, salt)`
Derives the vault master key from Master Password using Argon2id.

```typescript
const salt = window.crypto.getRandomValues(new Uint8Array(16));
const masterKey: CryptoKey = await cryptoService.deriveMasterKey('MyPassword123!', salt);
```

**Parameters:**
- `password: string` - The person's master password
- `salt: Uint8Array` - 16-byte random salt (stored in localStorage as `crytotool_salt`)

**Returns:** `Promise<CryptoKey>` - AES-256-GCM CryptoKey (non-extractable)

**Argon2id Parameters:**
- Memory: 128MB (131072 KB)
- Iterations: 4
- Parallelism: 4 threads
- Hash length: 32 bytes

> **Warning**: Increasing the Argon2id `cost` parameters (memory, iterations) will make brute-force attacks harder but will also slow down unlock times, especially on mobile devices. Test thoroughly before changing.

---

### `cryptoService.encrypt(data, key?)`
Encrypts data using the vault key (default) or provided key.

```typescript
const encrypted: EncryptedData = await cryptoService.encrypt(fileBlob);
```

**Parameters:**
- `data: Blob | Uint8Array` - Data to encrypt
- `key: CryptoKey` (optional) - Defaults to `this.vaultKey`

**Returns:** `Promise<EncryptedData>`
```typescript
interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;        // 12 bytes random
  salt: Uint8Array;       // Empty for default encryption
  algorithm: CryptoAlgorithm;
}
```

---

### `cryptoService.decrypt(encryptedData, iv, key?, algorithm?, salt?, passphrase?)`
Decrypts data using vault key or passphrase.

```typescript
const decrypted: Uint8Array = await cryptoService.decrypt(
  encryptedData, iv, vaultKey, 'AES-GCM'
);
```

**Parameters:**
- `encryptedData: Uint8Array` - Ciphertext
- `iv: Uint8Array` - Initialization vector
- `key: CryptoKey` (optional) - Defaults to `this.vaultKey`
- `algorithm: CryptoAlgorithm` (optional) - Defaults to 'AES-GCM'
- `salt: Uint8Array` (optional) - Required for passphrase decryption
- `passphrase: string` (optional) - For manual decryption

---

### `cryptoService.encryptString(data, key?)`
Encrypts a string using Vault Key (for localStorage storage).

```typescript
const encrypted = await cryptoService.encryptString('my-secret-key-1234');
// Returns: { ciphertext: string (base64), iv: string (base64) }
```

**Used for:** Encrypting PIN hash, recovery codes, vault keys before localStorage.

---

### `cryptoService.decryptString(ciphertextB64, ivB64, key?)`
Decrypts a string encrypted with `encryptString()`.

```typescript
const decrypted = await cryptoService.decryptString(
  encrypted.ciphertext, 
  encrypted.iv
);
```

---

### `cryptoService.encryptWithPassphrase(data, passphrase, algorithm)`
Manual encryption with person-chosen algorithm and passphrase.

```typescript
const encrypted = await cryptoService.encryptWithPassphrase(
  fileData,
  'MY-SECRET-KEY',
  'XChaCha20-Poly1305'
);
```

**Supported Algorithms:**
- `'AES-GCM'` - NIST standard, hardware-accelerated
- `'AES-CTR'` - With HMAC integrity check
- `'ChaCha20-Poly1305'` - Mobile-optimized
- `'XChaCha20-Poly1305'` - Extended nonce (192-bit)
- `'Salsa20-Poly1305'` - DJB's stream cipher
- `'AES-GCM-Stream'` - Use `streamCrypto.encrypt()` instead

---

## Backup Crypto Service
_Location: `utils/backupCrypto.ts`_

Handles encrypted backup creation and restoration.

### `backupCryptoService.generatePassphrase()`
Generates a 26-character backup key (130 bits entropy).

```typescript
const key = backupCryptoService.generatePassphrase();
// Returns: "X9F2-KLP0-ABCD-EFGH-IJKL-MNOP-QRST-UVWX"
```

**Character set:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars)

---

### `backupCryptoService.encryptBackup(dataString, passphrase)`
Encrypts backup data with PBKDF2-SHA256 + AES-256-GCM.

```typescript
const backup = await backupCryptoService.encryptBackup(
  JSON.stringify(backupData),
  passphrase
);
// Returns: Uint8Array in format [16-byte salt][12-byte IV][ciphertext + 16-byte GCM tag]
```

---

### `backupCryptoService.decryptBackup(encryptedData, passphrase)`
Decrypts a backup file.

```typescript
const decrypted = await backupCryptoService.decryptBackup(
  backupArrayBuffer,
  passphrase
);
const backupData = JSON.parse(decrypted);
```

---

## Stream Crypto
_Location: `utils/streamCrypto.ts`_

Processes large files in 4MB chunks to avoid memory issues.

### `streamCrypto.encrypt(data, passphrase)`
Streaming encryption for large files.

```typescript
const encrypted = await streamCrypto.encrypt(fileBlob, 'STREAM-KEY');
// Returns: Uint8Array with header + encrypted chunks
```

**Header Format:**
```typescript
interface StreamHeader {
  magic: 'CRYTO_STREAM';  // 12 bytes
  version: 1;              // 4 bytes
  algorithm: 'AES-GCM-Stream';
  chunkSize: 4194304;       // 4MB
  totalChunks: number;
  originalSize: number;
  salt: Uint8Array;         // 16 bytes
  baseIV: Uint8Array;        // 12 bytes
}
```

---

### `streamCrypto.decrypt(encryptedData, passphrase)`
Decrypts streaming-encrypted files.

```typescript
const decrypted = await streamCrypto.decrypt(encryptedBuffer, passphrase);
// Returns: Uint8Array of original file
```

---

## Vault Storage
_Location: `utils/vaultStorage.ts`_

Manages encrypted storage of manual encryption keys in localStorage.

### `vaultStorage.saveAll(entries)`
Saves all vault key entries (encrypted with Vault Key).

```typescript
await vaultStorage.saveAll([
  { name: 'My Key', category: 'personal', key: 'ABCD-1234-...' }
]);
// Stored in localStorage as 'crytotool_vault_keys' (encrypted JSON)
```

---

### `vaultStorage.getAll()`
Retrieves and decrypts vault key entries.

```typescript
const entries = await vaultStorage.getAll();
// Returns: VaultKeyEntry[] or [] if error
```

**Handles:** Legacy plaintext format migration.

---

## Database (IndexedDB)
_Location: `utils/db.ts`_

Wrapper for IndexedDB operations.

### `db.addItem(item)`
Adds encrypted file/folder to vault.

```typescript
await db.addItem({
  id: crypto.randomUUID(),
  parentId: null, // root level
  type: 'file',
  name: 'document.pdf',
  fileData: encryptedBlob,
  iv: base64IV,
  algorithm: 'AES-GCM',
  isEncrypted: true,
  category: 'doc'
});
```

---

### `db.exportDatabase()`
Exports all data for backup.

```typescript
const data = await db.exportDatabase();
// Returns: DBItem[] (all items in IndexedDB)
```

---

### `db.importDatabase(items)`
Imports data from backup.

```typescript
await db.importDatabase(backupData.db);
```

---

## Security Utilities
_Location: `utils/security.ts`_

### `hashPin(pin)`
Hashes and encrypts a 6-digit PIN for localStorage.

```typescript
const encryptedHash = await hashPin('123456');
// Stored as 'crytotool_vault_pin_hash' (encrypted)
```

---

### `verifyPin(pin, storedHash)`
Verifies a PIN against stored hash (handles encrypted and legacy formats).

```typescript
const isValid = await verifyPin('123456', storedHash);
// Returns: boolean
```

---

### `getBackoffTime(failedAttempts)`
Calculates lockout duration after failed unlock attempts.

```typescript
const seconds = getBackoffTime(3); // Returns: 30
// 3 attempts → 30s, 4 → 60s, 5+ → 300s
```

---

## Type Definitions

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
  iv?: string;        // Base64
  salt?: string;       // Base64
  algorithm?: CryptoAlgorithm;
  isEncrypted?: boolean;
  category?: 'image' | 'video' | 'audio' | 'doc' | 'other';
  isTrashed?: boolean;
  tags?: Tag[];
  customIcon?: string;
}

interface VaultKeyEntry {
  name: string;
  category: string;
  key: string; // The actual encryption key
}
```

---

## Important Notes

1. **Vault Key is private** - Not accessible via `window.cryptoService.vaultKey` (closure pattern)
2. **All crypto runs in browser** - No server involved
3. **Use `encryptString/decryptString`** for any localStorage storage
4. **Always handle errors** - Crypto operations can fail (e.g., wrong key)
5. **People-first terminology** - Use "people"/"persoane" in all UI text

---

## Examples

### Full Encryption Flow (Manual)
```typescript
// 1. Generate key
const key = 'ABCD-1234-EFGH-5678';

// 2. Get file data
const fileData = new Uint8Array(await file.arrayBuffer());

// 3. Encrypt with chosen algorithm
const encrypted = await cryptoService.encryptWithPassphrase(
  fileData,
  key,
  'XChaCha20-Poly1305'
);

// 4. Save to vault
await db.addItem({
  id: crypto.randomUUID(),
  parentId: null,
  type: 'file',
  name: file.name,
  fileData: new Blob([encrypted.ciphertext]),
  iv: btoa(String.fromCharCode(...encrypted.iv)),
  salt: btoa(String.fromCharCode(...encrypted.salt)),
  algorithm: 'XChaCha20-Poly1305',
  isEncrypted: true
});

// 5. Optionally save key to vault storage
await vaultStorage.saveAll([...existing, { name: 'My File Key', category: 'docs', key }]);
```

### Decryption Flow
```typescript
// 1. Get item from DB
const item = await db.getItem(itemId);

// 2. Decrypt
const decrypted = await cryptoService.decrypt(
  new Uint8Array(await item.fileData.arrayBuffer()),
  base64ToArrayBuffer(item.iv),
  undefined,
  item.algorithm,
  base64ToArrayBuffer(item.salt),
  'ABCD-1234-EFGH-5678' // passphrase
);

// 3. Create download
const blob = new Blob([decrypted]);
const url = URL.createObjectURL(blob);
// ... trigger download
```
