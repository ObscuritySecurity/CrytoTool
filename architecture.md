# CrytoTool Architecture Overview
_Version: 2.5.0-PRO | Last Updated: 2026-05-01_

## Table of Contents
1. [Database Encryption (IndexedDB)](#1-database-encryption-indexeddb)
2. [File & Folder Encryption](#2-file--folder-encryption)
   - [Automatic Encryption (Vault Default)](#automatic-encryption-vault-default)
   - [Manual Encryption](#manual-encryption)
3. [Encrypted Backup System](#3-encrypted-backup-system)
4. [Streaming Encryption](#4-streaming-encryption)
5. [Project Directory Structure](#5-project-directory-structure)
   - [Source Code Tree](#source-code-tree)
   - [IndexedDB Data Hierarchy](#indexeddb-data-hierarchy)

---

## 1. Database Encryption (IndexedDB)
CrytoTool uses **IndexedDB** (client-side only, no server) as its primary storage, wrapped by the `utils/db.ts` VaultDB service.

### Master Key Derivation
The vault master key is derived from the user's Master Password using **Argon2id** via the `hash-wasm` library (`utils/crypto.ts:36-55`):
```
Master Password + Random Salt (16 bytes) → Argon2id (10 iterations, 64MB memory, 4-way parallelism) → 32-byte hash → Imported as AES-256-GCM CryptoKey
```
Parameters:
- Iterations: 10
- Memory: 65536 KB (64MB)
- Parallelism: 4 threads
- Hash length: 32 bytes (256 bits)
- Output: Raw binary, imported as `CryptoKey` for AES-GCM operations

The derived key is stored **only in memory** (`cryptoService.vaultKey`) and never written to localStorage to minimize leakage risk.

### Automatic Encryption on File Add
When a file is added via `db.addItem()` (`utils/db.ts:65-83`):
1. Check if `item.fileData` exists and `!item.isEncrypted`
2. Call `cryptoService.encrypt(item.fileData)` which:
   - Generates a random 12-byte IV
   - Encrypts the file blob using AES-GCM with the in-memory vault key
   - Returns `{ ciphertext: Uint8Array, iv: Uint8Array, salt: empty Uint8Array, algorithm: 'AES-GCM' }`
3. Store in IndexedDB:
   - `fileData`: Blob containing the ciphertext
   - `iv`: Base64-encoded IV
   - `algorithm`: 'AES-GCM'
   - `isEncrypted`: true

---

## 2. File & Folder Encryption
### Automatic Encryption (Vault Default)
- **Trigger**: Any file added via the Dashboard, Upload, or New Folder action
- **Algorithm**: AES-256-GCM (industry standard)
- **Key**: In-memory Vault Key (derived from Master Password via Argon2id)
- **Storage**: IndexedDB with `isEncrypted: true` flag
- **No user intervention required**: Key management is automatic

### Manual Encryption
Triggered via the `EncryptionModal` component (`components/EncryptionModal.tsx`) for files already in the vault.

#### Workflow (`EncryptionModal.tsx:200-269`):
1. **Algorithm Selection**: Choose from 6 supported algorithms:
   | Algorithm | Description | Use Case |
   |------------|-------------|----------|
   | AES-GCM-Stream | 4MB chunked streaming | Large files, low-RAM devices |
   | AES-GCM | NIST-recommended standard | General purpose, documents, photos |
   | XChaCha20-Poly1305 | Extended 192-bit nonce | Cloud storage, long-term archival |
   | ChaCha20-Poly1305 | Mobile-optimized | Fast encryption on phones/tablets |
   | AES-CTR + HMAC | Classic AES with integrity check | Legacy compatibility |
   | Salsa20-Poly1305 | DJB's original stream cipher | Enthusiast choice, eSTREAM finalist |

2. **Key Generation**: A 32-byte random key is generated via `window.crypto.getRandomValues()`, formatted as uppercase hex with dashes (e.g., `A1B2-C3D4-E5F6-...`)

3. **Decrypt (if needed)**: If the file was previously encrypted with the default Vault Key, it is first decrypted using the in-memory vault key

4. **Encrypt with selected algorithm**:
   - For AES-GCM-Stream: `streamCrypto.encrypt(rawData, generatedKey)`
   - For other algorithms: `cryptoService.encryptWithPassphrase(rawData, generatedKey, algorithm)`

5. **Store in IndexedDB**: Update the file entry with `ciphertext`, `iv` (base64), `salt` (base64, for key derivation), `algorithm`, `isEncrypted: true`

6. **Optional Vault Storage**: Save the generated key to `vaultStorage` (localStorage) with a user-selected category for easy reuse

#### Manual Encryption Key Derivation (`crypto.ts:88-91`):
```
User-Generated Passphrase + Random Salt (16 bytes) → BLAKE2b (libsodium) → 32-byte raw key → Passed to selected primitive
```

---

## 3. Encrypted Backup System
Implemented in `utils/backupCrypto.ts` and `components/views/BackupView.tsx`. Backups are fully client-side and never sent to a server.

### Backup Creation Flow (`BackupView.tsx:30-74`):
1. **Generate Backup Key**: 26-character alphanumeric key (130 bits entropy) via `backupCryptoService.generatePassphrase()`
   - Character set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes ambiguous characters)
   - Format: 6 groups of 4 characters separated by dashes (e.g., `X9F2-KLP0-ABCD-EFGH-IJKL-MNOP-QRST-UVWX`)

2. **Collect Data**:
   - IndexedDB dump: `db.exportDatabase()` (all file entries, converted to Base64)
   - LocalStorage entries: `crytotool_theme_config`, `crytotool_vault_cats`, `crytotool_salt`, `crytotool_iv`, `crytotool_vault_blob`, `crytotool_vault_enabled`, `crytotool_vault_pin`, `crytotool_recovery_codes`
   - Package as JSON:
     ```json
     {
       "localStorage": { ... },
       "db": [ ... ],
       "timestamp": 1714523200000,
       "version": "2.5.0"
     }
     ```

3. **Encrypt Backup** (`backupCryptoService.encryptBackup`):
   - Generate random 16-byte salt
   - Derive AES-256 key: `Passphrase + Salt → PBKDF2-SHA256 (100,000 iterations) → AES-256-GCM CryptoKey`
   - Generate random 12-byte IV
   - Encrypt JSON string with AES-GCM (includes 16-byte GCM authentication tag)

4. **File Format**:
   ```
   [16-byte Salt][12-byte IV][Ciphertext + 16-byte GCM Tag]
   ```

5. **Download**: Auto-triggered as `crytotool-backup-YYYY-MM-DD.enc`

### Backup Restoration Flow (`BackupView.tsx:83-110`):
1. Upload `.enc` backup file
2. Enter 26-character backup key
3. Extract salt (16 bytes) + IV (12 bytes) + ciphertext
4. Derive key with PBKDF2-SHA256 (100k iterations)
5. Decrypt with AES-GCM → Parse JSON
6. Restore localStorage entries and import IndexedDB data via `db.importDatabase()`
7. Reload the application

---

## 4. Streaming Encryption
Designed for large files on low-RAM devices, implemented in `utils/streamCrypto.ts`. Processes files in 4MB chunks to avoid loading the entire file into memory.

### Encryption Flow (`streamCrypto.encrypt`):
1. Generate random 16-byte salt and 12-byte base IV
2. Derive stream key: `Passphrase + Salt → BLAKE2b (libsodium, 32-byte output) → AES-256-GCM CryptoKey`
3. Calculate total chunks: `Math.ceil(fileSize / 4MB)`
4. Build header:
   ```typescript
   interface StreamHeader {
     magic: 'CRYTO_STREAM';
     version: 1;
     algorithm: 'AES-GCM-Stream';
     chunkSize: 4194304; // 4MB
     totalChunks: number;
     originalSize: number;
     salt: Uint8Array; // 16 bytes
     baseIV: Uint8Array; // 12 bytes
   }
   ```
5. For each chunk:
   - Derive chunk IV: `baseIV (first 8 bytes) + chunkIndex (4 bytes, big-endian)`
   - Encrypt chunk with AES-GCM using the derived key
   - Append encrypted chunk (includes GCM tag) to output
6. Final output: `[Encoded Header][Chunk 0][Chunk 1]...[Chunk N]`

### Decryption Flow (`streamCrypto.decrypt`):
1. Decode header from first `headerSize` bytes
2. Verify magic: `CRYTO_STREAM`
3. Derive stream key once using salt from header
4. For each chunk:
   - Derive chunk IV from baseIV + chunk index
   - Decrypt chunk with AES-GCM
5. Reassemble all decrypted chunks into the original file

---

## 5. Project Directory Structure

### Source Code Tree
```
CrytoTool/
├── 📄 index.html                # App entry point
├── 📄 package.json              # Dependencies & scripts
├── 📄 vite.config.ts            # Vite build config
├── 📄 tailwind.config.js        # Tailwind CSS config
├── 📄 tsconfig.json             # TypeScript config
├── 📄 capacitor.config.json     # Capacitor mobile config
├── 📄 postcss.config.js         # PostCSS config
├── 📄 AGENTS.md                 # Agent instructions
├── 📄 CLAUDE.md                 # Claude agent instructions
├── 📄 README.md                 # Project readme
│
├── 📁 src-tauri/                # Tauri desktop backend (Rust)
│   ├── 📄 Cargo.toml            # Rust dependencies
│   ├── 📄 tauri.conf.json       # Tauri config
│   └── 📁 icons/                # Desktop app icons
│       ├── icon.ico, icon.icns, 128x128.png, etc.
│
├── 📁 android/                  # Android mobile project
│   └── 📁 app/src/
│
├── 📁 ios/                      # iOS mobile project
│   └── 📁 App/Assets.xcassets/
│
├── 📁 utils/                    # Core logic & crypto services
│   ├── 📄 crypto.ts             # Master key derivation, AES-GCM encrypt/decrypt
│   ├── 📄 cryptoPrimitives.ts   # Isolated crypto primitives (aesGcm, aesCtr, chacha20, etc.)
│   ├── 📄 streamCrypto.ts       # 4MB chunked streaming encryption
│   ├── 📄 backupCrypto.ts       # Backup key gen, PBKDF2, AES-256-GCM backup encrypt/decrypt
│   ├── 📄 db.ts                 # IndexedDB wrapper (CRUD, export/import)
│   ├── 📄 vaultStorage.ts       # localStorage vault key management
│   ├── 📄 security.ts           # PIN, auto-lock, failed attempt handling
│   ├── 📄 i18n.ts               # 50+ language translations
│   ├── 📄 i18nContext.tsx       # React i18n context provider
│   ├── 📄 themes.ts             # Theme configurations
│   ├── 📄 fonts.ts              # Font configurations
│   └── 📄 fonts-imports.ts      # Font face imports
│
├── 📁 components/               # React UI components
│   ├── 📄 App.tsx               # Main app state, auth flow, recovery codes
│   ├── 📄 index.tsx             # React entry point
│   ├── 📄 LandingPage.tsx       # Welcome/landing screen
│   ├── 📄 SplashScreen.tsx      # App splash screen
│   ├── 📄 AuthScreen.tsx        # Unlock/setup screen + recovery modal
│   ├── 📄 Dashboard.tsx         # Main file manager view
│   ├── 📄 EncryptionModal.tsx   # Manual encryption UI
│   ├── 📄 DecryptModal.tsx      # Decryption UI
│   ├── 📄 PinModal.tsx          # PIN input modal
│   ├── 📄 FileItem.tsx          # Individual file/folder component
│   ├── 📄 FileActionMenu.tsx    # File right-click action menu
│   ├── 📄 CopyMoveModal.tsx     # Copy/move files modal
│   ├── 📄 TopActions.tsx        # Top bar actions
│   ├── 📄 ui.tsx                # Reusable UI components
│   │
│   └── 📁 views/                # Full-page views
│       ├── 📄 StorageView.tsx    # Main file storage view
│       ├── 📄 GalleryView.tsx    # Image gallery view
│       ├── 📄 MusicView.tsx      # Audio/music view
│       ├── 📄 VaultView.tsx      # Saved encryption keys vault
│       ├── 📄 BackupView.tsx     # Backup & restore UI
│       ├── 📄 SettingsView.tsx   # App settings + recovery codes
│       ├── 📄 SearchView.tsx     # Cross-file search
│       └── 📄 TrashView.tsx      # Trash/bin view
│
├── 📁 styles/
│   └── 📄 glass.css             # Glassmorphism UI styles
│
└── 📁 .github/workflows/        # CI/CD pipelines
    ├── 📄 build.yml
    ├── 📄 security.yml
    └── 📄 opencode.yml
```

### IndexedDB Data Hierarchy
```
IndexedDB: "CrytoToolVault" (Version 2)
└── Object Store: "files" (keyPath: 'id')
    │
    ├── 📁 Root Folder (parentId: null, type: 'folder')
    │   ├── 📄 File 1 (parentId: root_id, type: 'file', isEncrypted: true, algorithm: 'AES-GCM')
    │   ├── 📄 File 2 (parentId: root_id, type: 'file', isEncrypted: true, algorithm: 'XChaCha20-Poly1305')
    │   └── 📁 Subfolder (parentId: root_id, type: 'folder')
    │       ├── 📄 File 3 (parentId: subfolder_id, type: 'file', isEncrypted: true, algorithm: 'AES-GCM-Stream')
    │       └── 📁 Sub-Subfolder (parentId: subfolder_id, type: 'folder')
    │           └── 📄 File 4 (parentId: subsubfolder_id, type: 'file', isEncrypted: true)
    │
    ├── 📁 Gallery Folder (parentId: null, type: 'folder', category: 'image')
    ├── 📁 Music Folder (parentId: null, type: 'folder', category: 'audio')
    └── 📁 System Folder (parentId: null, type: 'system')  # Protected system files
```

#### DBItem Fields (from `utils/db.ts`):
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique UUID for the item |
| `parentId` | string \| null | ID of parent folder (null = root level) |
| `type` | 'file' \| 'folder' \| 'system' | Item type |
| `name` | string | Display name |
| `size` | string (optional) | Human-readable file size |
| `date` | string | Creation/modification date |
| `fileData` | Blob (optional) | Encrypted file data (files only) |
| `iv` | string (optional) | Base64-encoded IV |
| `salt` | string (optional) | Base64-encoded salt (for manual encryption key derivation) |
| `algorithm` | CryptoAlgorithm (optional) | Encryption algorithm used |
| `isEncrypted` | boolean (optional) | Whether the file is encrypted |
| `category` | 'image' \| 'video' \| 'audio' \| 'doc' \| 'other' (optional) | File category |
| `isTrashed` | boolean (optional) | Whether the item is in the trash |
| `tags` | Tag[] (optional) | User-assigned tags |
| `customIcon` | string (optional) | Custom icon for the item |

---

## 6. Vault Key Storage (Encrypted localStorage)
### Security Problem & Solution
**Problem**: Vault keys (for manual encryption) were previously stored as plaintext JSON in `localStorage` (`crytotool_vault_keys`). Anyone with access to the browser (or via XSS) could read all encryption keys.

**Solution**: All vault keys are now **encrypted with the Vault Key** (AES-256-GCM) before being saved to localStorage.

### Storage Format
```json
{
  "iv": "<base64-encoded-12-byte-IV>",
  "data": "<base64-encoded-AES-GCM-ciphertext>"
}
```
- `iv`: Random 12-byte IV, Base64-encoded
- `data`: The JSON string of all `VaultKeyEntry[]` objects, encrypted with AES-GCM using the in-memory Vault Key

### Encryption Flow (`utils/crypto.ts:232-266`)
```
JSON.stringify(vaultKeyEntries) → TextEncoder → AES-GCM (Vault Key, random IV) → Base64 encode → localStorage
```

### Decryption Flow
```
localStorage → Parse JSON → Base64 decode (iv + data) → AES-GCM decrypt (Vault Key) → TextDecoder → JSON.parse → VaultKeyEntry[]
```

### Key Points
- The Vault Key is **never stored**; it is derived from the Master Password via Argon2id and kept only in memory
- If the user locks the vault (logout), the Vault Key is cleared from memory and stored keys become unreadable
- Legacy plaintext keys (from older versions) are automatically handled: they are returned as-is and migrated to encrypted format on next save
- This protects against: local browser access, XSS attacks (if attacker doesn't have the Vault Key), and accidental localStorage inspection

### Implementation Files
| File | Role |
|------|------|
| `utils/crypto.ts` | `encryptString()` / `decryptString()` methods for string encryption using Vault Key |
| `utils/vaultStorage.ts` | `saveAll()` encrypts before `localStorage.setItem()`; `getAll()` decrypts after `localStorage.getItem()` |
| `components/EncryptionModal.tsx` | Calls `vaultStorage.save()` (now async) with `await` |
| `components/views/VaultView.tsx` | All `vaultStorage` calls updated to async/await |
| `components/DecryptModal.tsx` | `vaultStorage.getByFileId()` called with `await` |
