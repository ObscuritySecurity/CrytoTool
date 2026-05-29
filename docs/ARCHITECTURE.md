# CrytoTool Architecture Overview
_Version: 2.5.0-beta | Last Updated: 2026-05-27_

## Table of Contents
1. [Database Encryption (IndexedDB)](#1-database-encryption-indexeddb)
2. [Metadata Encryption](#2-metadata-encryption)
3. [Encrypted Backup System](#3-encrypted-backup-system)
4. [Streaming Encryption](#4-streaming-encryption)
5. [Project Directory Structure](#5-project-directory-structure)
   - [Source Code Tree](#source-code-tree)
   - [IndexedDB Data Hierarchy](#indexeddb-data-hierarchy)

---

## 1. Database Encryption (IndexedDB)

### Master Key Derivation
The vault master key is derived from the person's Master Password using **Argon2id** via the `hash-wasm` library (`utils/crypto.ts:26-44`):
```
Master Password + Random Salt (16 bytes) → Argon2id (19 iterations, 128MB memory, 4-way parallelism) → 32-byte hash → Imported as AES-256-GCM CryptoKey
```
Parameters:
- Iterations: 19
- Memory: 131072 KB (128MB)
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

## 2. Metadata Encryption
Implemented in `utils/metadataCrypto.ts`. All sensitive metadata fields (file names, tags, artist, album, coverUrl, customIcon, externalUrl) are encrypted with AES-256-GCM using the in-memory vault key before being stored in IndexedDB.

### Encryption Flow (`metadataCrypto.ts:21-24`)
```
{ name, tags, artist, album, coverUrl, customIcon, externalUrl }
  → JSON.stringify
  → cryptoService.encryptString(json)  // AES-256-GCM with vault key + random IV
  → { ciphertext: base64, iv: base64 }
  → stored in DBItem.encryptedMeta
```

### Metadata Fields Protected
| Field | Description | Encrypted? |
|-------|-------------|------------|
| `name` | File/folder display name | **YES** |
| `tags` | Person-assigned tags with label + color | **YES** |
| `artist` | Audio artist metadata | **YES** |
| `album` | Audio album metadata | **YES** |
| `coverUrl` | Cover image URL | **YES** |
| `customIcon` | Custom icon identifier | **YES** |
| `externalUrl` | External file reference URL | **YES** |

### Fields That Remain Plaintext
These fields stay unencrypted because they are required for IndexedDB queries, filtering, and UI rendering without needing to decrypt every record:
`id`, `parentId`, `type`, `size`, `date`, `category`, `isEncrypted`, `isTrashed`, `isFavorite`, `iv`, `salt`, `algorithm`, `iconOnlyMode`

### Write Path (`db.ts:94-109`)
When `addItem()` or `updateItem()` is called:
1. Check if `item.encryptedMeta` is absent and sensitive fields exist
2. Call `metadataCrypto.encrypt()` → produces `{ ciphertext, iv }`
3. Call `metadataCrypto.stripFromItem()` → removes plaintext name, tags, artist etc.
4. Set `item.encryptedMeta` to the encrypted blob
5. Store the item in IndexedDB

### Read Path
Items are returned from IndexedDB with `encryptedMeta` intact. The UI layer calls `metadataCrypto.extractPlaintext(item)` or `metadataCrypto.getDisplayName(item)` to decrypt on-demand using the in-memory vault key. Fallback to legacy plaintext fields if `encryptedMeta` is absent (backward compatibility).

### Schema Migration (`db.ts:61-86`)
On upgrade to `DB_VERSION = 3`, existing items without `encryptedMeta` are migrated via a cursor:
- Plaintext `name` is base64-encoded into `encryptedMeta.ciphertext`
- Legacy `tags`, `artist`, `album`, `coverUrl`, `customIcon`, `externalUrl` are removed

## 3. Encrypted Backup System
Implemented in `utils/backupCrypto.ts` and `components/views/BackupView.tsx`. Backups are fully client-side and never sent to a server.

### Backup Creation Flow (`BackupView.tsx:30-74`):
1. **Generate Backup Key**: 26-character alphanumeric key (130 bits entropy) via `backupCryptoService.generatePassphrase()`
   - Character set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes ambiguous characters)
   - Format: 26 characters with dashes every 4th character (e.g., `X9F2-KLP0-ABCD-EFGH-IJKL-MNOP-QR`)

2. **Collect Data**:
   - IndexedDB dump: `db.exportDatabase()` (all file entries, converted to Base64)
   - LocalStorage entries: `crytotool_theme_config`, `crytotool_vault_cats`, `crytotool_salt`, `crytotool_iv`, `crytotool_vault_blob`, `crytotool_vault_enabled`, `crytotool_vault_pin`, `crytotool_recovery_codes`
   - Package as JSON:
     ```json
     {
       "localStorage": { ... },
       "db": [ ... ],
       "timestamp": 1714523200000,
       "version": "2.5.0-beta"
     }
     ```

3. **Encrypt Backup** (`backupCryptoService.encryptBackup`):
   - Generate random 16-byte salt
    - Derive AES-256 key: `Passphrase + Salt → Argon2id (19 iterations, 128MB memory) → AES-256-GCM CryptoKey`
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
4. Derive key with Argon2id (19 iterations, 128MB memory)
5. Decrypt with AES-GCM → Parse JSON
6. Restore localStorage entries and import IndexedDB data via `db.importDatabase()`
7. Reload the application

---

## 4. Streaming Encryption
Designed for large files on low-RAM devices, implemented in `utils/streamCrypto.ts`. Processes files in 4MB chunks to avoid loading the entire file into memory.

### Encryption Flow (`streamCrypto.encrypt`):
1. Generate random 16-byte salt and 12-byte base IV
2. Derive stream key: `Passphrase + Salt → Argon2id (hash-wasm, 4 iterations, 128MB memory) → AES-256-GCM CryptoKey`
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
    - Derive chunk IV: `HMAC-SHA256(chunkIndex, keyed with baseIV) → first 12 bytes`
    - Encrypt chunk with AES-GCM using the derived key
   - Append encrypted chunk (includes GCM tag) to output
6. Final output: `[Encoded Header][Chunk 0][Chunk 1]...[Chunk N]`

### Decryption Flow (`streamCrypto.decrypt`):
1. Decode header from first `headerSize` bytes
2. Verify magic: `CRYTO_STREAM`
3. Derive stream key once using salt from header (Argon2id, 4 iterations, 128MB memory)
4. For each chunk:
   - Derive chunk IV via `HMAC-SHA256(chunkIndex keyed with baseIV) → first 12 bytes`
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
├── 📄 postcss.config.js         # PostCSS config
├── 📄 AGENTS.md                 # Agent instructions
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
│   ├── 📄 metadataCrypto.ts     # AES-GCM metadata encryption (names, tags, artist, etc.)
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
    ├── 📄 tauri-macos.yml
    ├── 📄 tauri-windows.yml
    ├── 📄 tauri-linux.yml
    ├── 📄 tauri-android.yml
    └── 📄 release.yml
```

### IndexedDB Data Hierarchy
```
IndexedDB: "CrytoToolVault" (Version 3)
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
| `name` | string | Display name (empty if encryptedMeta present) |
| `encryptedMeta` | `{ ciphertext: string, iv: string }` (optional) | AES-256-GCM encrypted metadata blob (name, tags, artist, album, etc.) |
| `size` | string (optional) | Human-readable file size |
| `date` | string | Creation/modification date |
| `fileData` | Blob (optional) | Encrypted file data (files only) |
| `iv` | string (optional) | Base64-encoded IV |
| `salt` | string (optional) | Base64-encoded salt (for manual encryption key derivation) |
| `algorithm` | CryptoAlgorithm (optional) | Encryption algorithm used |
| `isEncrypted` | boolean (optional) | Whether the file is encrypted |
| `category` | 'image' \| 'video' \| 'audio' \| 'doc' \| 'other' (optional) | File category |
| `isTrashed` | boolean (optional) | Whether the item is in the trash |
| `tags` | Tag[] (optional) | Person-assigned tags |
| `customIcon` | string (optional) | Custom icon for the item |
