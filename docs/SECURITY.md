# CrytoTool Security Documentation
_Version: 2.5.0-beta | Last Updated: 2026-05-28_

## Security Philosophy
**CrytoTool respects the people behind the screen.** Security is not just about code — it's about protecting people's digital lives. Every security decision prioritizes human safety over convenience.

---

## 1. Threat Model

### What We Protect Against (Attack Surface Covered)

| Attack | How We Protect | Status |
|--------|----------------|--------|
| **Master Password Brute-force** | Argon2id (128MB memory, 19 iterations, 4 threads) — drastically slows down brute-force | ✅ Protected |
| **Physical Device Access** | Vault Key only in memory (RAM), cleared on lock; IndexedDB encrypted with AES-GCM | ✅ Protected |
| **localStorage Extraction** | Manual encryption keys are encrypted with Vault Key (AES-256-GCM) before storage; recovery codes and PIN hash also encrypted | ✅ Protected |
| **Data Interception at Rest** | All file data encrypted with AES-256-GCM; metadata (names, tags, artist, etc.) encrypted separately | ✅ Protected |
| **Algorithm Collision** | 6 standard algorithms: AES-256-GCM, AES-CTR+HMAC, ChaCha20-Poly1305, XChaCha20-Poly1305, Salsa20-Poly1305, AES-GCM-Stream | ✅ Protected |
| **Multi-person Access on Same Device** | Auto-lock after inactivity (default 25s), Progressive Lockout, Self-Destruct option | ✅ Protected |
| **Password Loss** | 10 unique recovery codes (8-char, ~40 bits entropy each), encrypted with vault key | ✅ Protected |
| **Supply Chain Attacks** | Regular `npm audit`, dependency overrides for transitive CVEs | ⚠️ Monitored |

### Cryptographic Algorithms Used

| Algorithm | Purpose | Location |
|-----------|---------|----------|
| Argon2id | Master key derivation, passphrase-based encryption (all modes), backup key derivation, stream key derivation | `crypto.ts`, `backupCrypto.ts`, `streamCrypto.ts` |
| AES-256-GCM | Default vault encryption, metadata encryption, localStorage encryption (PIN, recovery codes, vault keys), backup encryption, per-chunk stream encryption | `crypto.ts`, `metadataCrypto.ts`, `vaultStorage.ts`, `backupCrypto.ts`, `streamCrypto.ts` |
| AES-CTR + HMAC-SHA256 | Manual encryption option (encrypt-then-MAC, constant-time comparison) | `cryptoPrimitives.ts:62-131` |
| ChaCha20-Poly1305 | Manual encryption option (libsodium WASM) | `cryptoPrimitives.ts` |
| XChaCha20-Poly1305 | Manual encryption option (extended 192-bit nonce, libsodium WASM) | `cryptoPrimitives.ts` |
| Salsa20-Poly1305 | Manual encryption option (libsodium WASM) | `cryptoPrimitives.ts` |
| PBKDF2-SHA256 | PIN hashing (100,000 iterations) | `security.ts:33,53-62` |
| HMAC-SHA256 | Stream chunk IV derivation, AES-CTR integrity MAC | `streamCrypto.ts:31-43`, `cryptoPrimitives.ts:89-90` |

### Extreme Cases (Remaining Risks)

| Scenario | Why Not Fully Protected | Possible Mitigation |
|-----------|---------------------|----------------------|
| **XSS in Application** | If attacker can execute JS, they can access `cryptoService.vaultKey` (object in memory) | Content Security Policy (CSP) implemented via `<meta>` tag in `index.html` (inline scripts allowed only via SHA hash) |
| **Malicious Browser Extension** | Extensions have access to localStorage and can inject scripts | We have no control; people should only install trusted extensions |
| **Physical RAM Dumping** | If attacker can read browser process memory, Vault Key can be extracted | `CryptoKey` is already non-extractable (`extractable: false`) |
| **Supply Chain Attack on npm** | A compromised library could exfiltrate data via `postMessage` or `fetch` | `npm audit`, dependency overrides, limiting crypto dependencies to `hash-wasm` and `libsodium-wrappers` |
| **Social Engineering** | A person can be tricked into revealing their password | Education, clear interface |
| **Tauri Desktop CSP Bypass** | Tauri config sets `"csp": null`, disabling CSP entirely in desktop builds | Re-enable CSP in `tauri.conf.json` |

---

## 2. Security Architecture Decisions

### 2.1 Why Argon2id for Master Password?
- **Winner**: Password Hashing Competition (2015), recommended by OWASP
- **Memory-hard**: Uses 128MB RAM — drastically slows down GPU/ASIC brute-force attacks
- **Tuning**: 19 iterations (balanced between security and unlock speed on mobile devices)
- **Implementation**: `hash-wasm` (WASM bindings for Argon2id), consistent across all 5 crypto files

### 2.2 Why AES-GCM?
- **Authenticated**: Provides both confidentiality AND integrity (128-bit GCM authentication tag)
- **Industry Standard**: Recommended by NIST, used by banks and governments
- **Native in Browser**: Web Crypto API supports AES-GCM natively with hardware acceleration
- **Key size**: 256-bit (resistant to Grover's algorithm quantum attacks — provides ~128 bits post-quantum security)

### 2.3 Why Vault Key Only in Memory?
- **Principle**: If it's not on disk, it can't be read from disk
- **Storage**: `cryptoService.vaultKey` is a `CryptoKey` object (or `null`). Set in `crypto.ts:46-48` on unlock, cleared in `crypto.ts:50-52` on lock
- **localStorage**: We don't store the key here, although we could store a non-extractable `CryptoKey` — we chose not to for XSS safety
- **IndexedDB**: We don't store keys here because IndexedDB is accessible via JS (XSS)

### 2.4 Cryptographic Isolation (Defense in Depth)
- **`cryptoPrimitives.ts`**: All 6 algorithms are isolated in separate export objects within a single file. No shared mutable state between them (avoids domino effects)
- **`streamCrypto.ts`**: Streaming is separate from standard encryption. Uses Argon2id for key derivation, not the Vault Key directly. Chunk IVs derived via HMAC-SHA256 keyed with a random baseIV
- **`backupCrypto.ts`**: Backup key is derived independently (Argon2id, 19 iterations, 128MB memory) — does not use Vault Key
- **`metadataCrypto.ts`**: File metadata (name, tags, artist, album, etc.) encrypted separately with Vault Key via `cryptoService.encryptString()`
- **`vaultStorage.ts`**: Manual encryption keys are encrypted with Vault Key before localStorage. If Vault Key is cleared (lock), stored keys become unreadable

---

## 3. Cryptographic Parameters (Exact Values)

### 3.1 Argon2id Parameters (applied uniformly across all uses)

| Use Case | Iterations | Memory | Parallelism | Hash Length | Location |
|----------|-----------|--------|-------------|-------------|----------|
| Master Key Derivation | 19 | 131072 KB (128MB) | 4 | 32 bytes (256-bit) | `crypto.ts:27-35` |
| Passphrase Encryption | 19 | 131072 KB (128MB) | 4 | 32 bytes | `crypto.ts:75-83` |
| Backup Encryption | 19 | 131072 KB (128MB) | 4 | 32 bytes | `backupCrypto.ts:57-65` |
| Stream Encryption | 19 | 131072 KB (128MB) | 4 | 32 bytes | `streamCrypto.ts:46-54` |

### 3.2 AES-GCM Parameters

| Parameter | Value | Used In |
|-----------|-------|---------|
| Key size | 256-bit | All AES-GCM operations |
| IV length | 12 bytes (96 bits) | `cryptoPrimitives.ts:187`, `crypto.ts:164`, `backupCrypto.ts:88` |
| GCM tag length | 128-bit | Implicit (Web Crypto default) |
| IV generation | `crypto.getRandomValues()` | All encryption calls |

### 3.3 AES-CTR Parameters

| Parameter | Value | Location |
|-----------|-------|----------|
| Counter width | 64 bits | `cryptoPrimitives.ts:97` |
| IV size | 16 bytes | `cryptoPrimitives.ts:188` |
| Key derivation | HKDF-SHA256 → 2 sub-keys (encryption + MAC) | `cryptoPrimitives.ts:89-90` |
| Integrity | Encrypt-then-MAC with HMAC-SHA256, constant-time comparison | `cryptoPrimitives.ts:117-121` |

### 3.4 Chacha20/XChaCha20/Salsa20 Parameters

All implemented via `libsodium-wrappers` WASM:
- **ChaCha20-Poly1305**: Standard 96-bit nonce
- **XChaCha20-Poly1305**: Extended 192-bit nonce (recommended for random IVs)
- **Salsa20-Poly1305**: Original DJB stream cipher (eSTREAM finalist)

### 3.5 Streaming Encryption (AES-GCM-Stream)

| Parameter | Value | Location |
|-----------|-------|----------|
| Chunk size | 4 MB (4,194,304 bytes) | `streamCrypto.ts:16` |
| Per-chunk encryption | AES-256-GCM | `streamCrypto.ts:147-151` |
| Per-chunk IV derivation | HMAC-SHA256(baseIV, `chunk-iv-{index}`) → first 12 bytes | `streamCrypto.ts:31-43` |
| Per-chunk overhead | 16 bytes GCM tag | Implicit |
| Header format | `[magic][version][algorithm][chunkSize][totalChunks][originalSize][salt(16)][baseIV(12)]` | `streamCrypto.ts:65-91` |
| Total header size | ~56 bytes | |

### 3.6 Backup Encryption

| Parameter | Value | Location |
|-----------|-------|----------|
| KDF | Argon2id (19 iterations, 128MB, 4 threads) | `backupCrypto.ts:57-65` |
| Encryption | AES-256-GCM | `backupCrypto.ts:92-96` |
| Salt length | 16 bytes | `backupCrypto.ts:18` |
| IV length | 12 bytes | `backupCrypto.ts:88` |
| File format | `[salt(16)][IV(12)][ciphertext+GCM tag]` | `backupCrypto.ts:98-104` |
| Minimum valid size | 44 bytes (16+12+16) | `backupCrypto.ts:116` |
| Passphrase length | 26 characters | `backupCrypto.ts:30` |
| Passphrase alphabet | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (24 chars, excludes I,O,0,1) | `backupCrypto.ts:28` |
| Passphrase entropy | ~130 bits (26 × ~5 bits) | |
| Passphrase format | `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX` (groups of 4, dashes) | `backupCrypto.ts:45` |

### 3.7 PIN Hashing

| Parameter | Value | Location |
|-----------|-------|----------|
| Hash algorithm | PBKDF2-SHA256 | `security.ts:53-62` |
| Iterations | 100,000 | `security.ts:33` |
| Salt | 16 random bytes | `security.ts:86` |
| Output | 256-bit hex string | `security.ts:64` |
| Storage format | `JSON.stringify({ iv, data })` where data is AES-GCM of `"saltHex:hashHex"` | `security.ts:93-94` |
| Legacy formats | 64-char hex (SHA-256), direct string comparison | `PinModal.tsx:87,104` |

---

## 4. Vault Key Lifecycle

### 4.1 Vault Creation (`AuthScreen.tsx:90-98`)
1. Generate random 16-byte salt
2. Derive master key: `password + salt → Argon2id → AES-256-GCM CryptoKey`
3. Generate random vault key: `AES-256-GCM, 256-bit, extractable`
4. Encrypt raw vault key bytes with master key (AES-GCM)
5. Store in localStorage:
   - `crytotool_salt` — base64 of Argon2id salt
   - `crytotool_iv` — base64 of AES-GCM IV
   - `crytotool_vault_blob` — base64 of encrypted vault key bytes

### 4.2 Vault Unlock (`AuthScreen.tsx`)
1. Read salt from `crytotool_salt`
2. Re-derive master key from password + salt (Argon2id)
3. Decrypt vault blob with master key
4. Import raw key bytes as `CryptoKey` → stored in `cryptoService.vaultKey`
5. Vault Key never touches localStorage or IndexedDB

### 4.3 Vault Lock (`crypto.ts:50-52`)
- `cryptoService.clearKeys()` sets `this.vaultKey = null`
- All encrypted data becomes inaccessible until next unlock

---

## 5. localStorage Key Reference

### Vault & Authentication
| Key | Content | Encrypted | Set In |
|-----|---------|-----------|--------|
| `crytotool_salt` | Base64 of Argon2id salt (16 bytes) | No (salt is not secret) | `AuthScreen.tsx:96` |
| `crytotool_iv` | Base64 of AES-GCM IV for vault key encryption | No (IV is not secret) | `AuthScreen.tsx:97` |
| `crytotool_vault_blob` | Base64 of encrypted vault key bytes (AES-GCM) | Yes (AES-256-GCM) | `AuthScreen.tsx:98` |
| `crytotool_vault_enabled` | `"true"` or `"false"` | No | `App.tsx:69` |
| `crytotool_vault_pin_hash` | `JSON.stringify({ iv, data })` — encrypted PIN hash | Yes (AES-256-GCM) | `App.tsx:63` |
| `crytotool_vault_keys` | `JSON.stringify({ iv, data })` — encrypted vault key entries | Yes (AES-256-GCM) | `vaultStorage.ts:89` |
| `crytotool_vault_cats` | JSON array of vault categories | No | `VaultView.tsx:78` |

### Recovery Codes
| Key | Content | Encrypted | Set In |
|-----|---------|-----------|--------|
| `crytotool_recovery_codes` | `JSON.stringify({ iv, data })` — encrypted code array | Yes (AES-256-GCM) | `App.tsx:235` |

### Auto-lock / Activity
| Key | Content | Default | Set In |
|-----|---------|---------|--------|
| `crytotool_blur_time` | Seconds before blur | 20 | `App.tsx:431` |
| `crytotool_lock_time` | Seconds before lock | 25 | `App.tsx:438` |
| `crytotool_last_activity` | Last activity timestamp (unix ms) | — | `App.tsx:120` |

### Progressive Lock & Self-Destruct
| Key | Content | Default | Set In |
|-----|---------|---------|--------|
| `crytotool_prog_lock_time` | Lock duration in seconds | 60 | `App.tsx:445` |
| `crytotool_prog_attempts` | Failed attempts threshold | 3 | `App.tsx:450` |
| `crytotool_ad_enabled` | Self-destruct enabled flag | `false` | `App.tsx:457` |
| `crytotool_ad_attempts` | Failed attempts trigger | 5 | `App.tsx:462` |
| `crytotool_ad_inactivity` | Inactivity trigger (seconds, 0 = disabled) | 0 | `App.tsx:467` |
| `crytotool_ad_countdown` | Countdown before wipe | 30 | `App.tsx:472` |
| `crytotool_destruct_time` | Unix timestamp when destruct fires | — | `App.tsx:331` |

### Theme / UI
| Key | Content | Set In |
|-----|---------|--------|
| `app_theme_config` | Full theme config JSON | `Dashboard.tsx:447` |
| `app_theme_mode` | `dark` / `light` / `system` | `Dashboard.tsx:332` |
| `app_font_id` | Font identifier | `SettingsView.tsx:832` |
| `app_font_family` | Font family string | `SettingsView.tsx:833` |
| `app_language` | Language code (e.g. `en`, `ro`) | `i18nContext.tsx:25` |

---

## 6. Attack Surface

### What is Exposed to Attackers:

| Component | What it Exposes | Risk |
|-----------|------------------|------|
| **localStorage** | `crytotool_salt`, `crytotool_iv`, `crytotool_vault_pin_hash` (encrypted), `crytotool_recovery_codes` (encrypted), `crytotool_vault_keys` (encrypted), `crytotool_vault_cats`, `app_theme_config`, `app_theme_mode`, `app_font_id`, `app_font_family`, `app_language` | Access via XSS, disk reading |
| **IndexedDB** (`CrytoToolVault`, store `files`) | Encrypted file data (`fileData` as Blob), encrypted metadata (`encryptedMeta`), plaintext fields (`id`, `parentId`, `type`, `size`, `date`, `category`, `isEncrypted`, etc.) | Access via XSS (if Vault Key is available) |
| **Web Crypto API** | `CryptoKey` objects in memory | Extraction from RAM (protected by browser's sandbox) |
| **URL/History** | We don't store sensitive params in URL | Minimal risk (SPA without server) |
| **Service Workers** | Not used | N/A |
| **Iframes** | Not used | N/A |

### What is NOT Exposed:
- Master Password (only Argon2id hash in memory temporarily)
- Vault Key (only in memory, cleared on lock)
- Manual encryption keys (encrypted in localStorage with Vault Key)
- File names, tags, artist, album (encrypted in IndexedDB via `encryptedMeta`)

---

## 7. Incident Response

### 7.1 Progressive Lockout (`security.ts:25-31`)
| Failed attempts | Lockout duration |
|----------------|------------------|
| 0–2 | 0 (no lockout) |
| 3 | 30 seconds |
| 4 | 60 seconds (1 minute) |
| 5+ | 300 seconds (5 minutes) |

- Applied to both Master Password and PIN unlock attempts
- Backoff calculated via `getBackoffTime(failedAttempts)` returning seconds
- Lock state stored in `App.tsx` component state (not persisted across page reloads)

### 7.2 Self-Destruct (`App.tsx:299-310`)

**Trigger Conditions:**
1. **Failed password attempts**: If `autoDestructEnabled` AND `failedAttempts >= autoDestructAttempts` (default: 5), a countdown starts (default: 30s). Stored in `crytotool_destruct_time`.
2. **Inactivity (dead man's switch)**: If `autoDestructEnabled` AND `autoDestructInactivity > 0` AND elapsed time >= threshold. Checked every 1 second via `setInterval`.

**What gets destroyed:**
- IndexedDB (`CrytoToolVault`) — all file data and metadata
- All localStorage — vault keys, recovery codes, PIN, theme, everything
- Session storage
- In-memory Vault Key

**Grace Period**: Before destruction, a visual countdown is shown. Person can cancel by entering the correct password.

### 7.3 Dead Man Switch (`App.tsx:130-151, 354-385`)
- Monitors activity events: `mousedown`, `mousemove`, `keydown`, `touchstart`, `scroll`
- Timer checked every 1 second
- Progressive actions:
  1. `elapsed >= autoBlurSeconds` (default: 20s) → blur screen
  2. `elapsed >= autoLockSeconds` (default: 25s) → lock vault
  3. `elapsed >= autoDestructInactivity` → trigger Self-Destruct (if enabled)

---

## 8. Metadata Encryption

Implemented in `utils/metadataCrypto.ts`. All sensitive metadata fields are encrypted with AES-256-GCM using the in-memory vault key before being stored in IndexedDB.

### Encrypted Fields
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | File/folder display name |
| `tags` | Tag[] (optional) | `{id, label, color}` |
| `artist` | string (optional) | Audio artist |
| `album` | string (optional) | Audio album |
| `coverUrl` | string (optional) | Cover image URL |
| `customIcon` | string (optional) | Custom icon identifier |
| `externalUrl` | string (optional) | External link |

### Encryption Flow
1. JSON.stringify the metadata object
2. `cryptoService.encryptString(json)` → AES-256-GCM with vault key + random 12-byte IV
3. Store as `{ ciphertext: base64, iv: base64 }` in `DBItem.encryptedMeta`
4. Plaintext fields are stripped from the item via `metadataCrypto.stripFromItem()`

### Fallback
If the vault key is unavailable (e.g., during specific operations), metadata is stored in **plaintext** (`db.ts:107` catch block).

### Migration (v2→v3)
Existing items without `encryptedMeta` get a base64-encoded name as ciphertext with empty IV (`db.ts:70-73`). This is a forward-compatibility shim, not real encryption.

---

## 9. Audit Guidelines

### How to Audit CrytoTool Code for Security:

#### `utils/crypto.ts` (Master Key Derivation + Encryption)
- ✅ Check: Argon2id params (memory: 131072, iterations: 19, parallelism: 4) — line 27-35
- ✅ Check: `vaultKey` is set (`crypto.ts:46-48`) and cleared correctly (`crypto.ts:50-52`) — not remaining in memory after lock
- ✅ Check: `encrypt()` and `decrypt()` use AES-GCM with randomly generated IV (12 bytes) — lines 162-208
- ✅ Check: `vaultKey` is private (closure pattern, not accessible via `window`)

#### `utils/security.ts` (PIN + Lockout)
- ✅ Check: PIN hash uses PBKDF2-SHA256 with 100,000 iterations and random 16-byte salt — lines 43-65, 85-98
- ✅ Check: `verifyPin()` handles both encrypted and legacy plaintext formats — lines 105-136
- ✅ Check: Timing-safe comparison via `timingSafeEqual()` — lines 67-79
- ✅ Check: PIN hash is encrypted with Vault Key before localStorage — line 93
- ✅ Check: Common PINs blocked (20 common + sequential patterns) — lines 6-11, 19-20

#### `utils/backupCrypto.ts` (Backup Encryption)
- ✅ Check: Argon2id for backup key derivation (19 iterations, 128MB memory, 4 threads) — lines 57-65
- ✅ Check: Random salt (16 bytes) generated for each backup — line 86
- ✅ Check: Format `[salt(16)][IV(12)][ciphertext+GCM tag(16)]` — lines 98-104
- ✅ Check: Passphrase generated with rejection-method unbiased random — lines 27-49
- ✅ Check: Minimum file size validation (44 bytes) — line 116

#### `utils/streamCrypto.ts` (Streaming Encryption)
- ✅ Check: Chunk size is 4MB — line 16
- ✅ Check: Per-chunk IV derived via HMAC-SHA256(baseIV, `chunk-iv-{index}`) — lines 31-43
- ✅ Check: Argon2id for stream key derivation (same params) — lines 46-54
- ✅ Check: Header magic `CRYTO_STREAM` verified on decrypt — `decodeHeader()`

#### `utils/metadataCrypto.ts` (Metadata Encryption)
- ✅ Check: Encrypts name, tags, artist, album, coverUrl, customIcon, externalUrl — lines 21-24
- ✅ Check: Uses `cryptoService.encryptString()` (AES-256-GCM with vault key)
- ✅ Check: Plaintext fields stripped after encryption — `stripFromItem()` lines 61-70

#### `utils/cryptoPrimitives.ts` (Isolated Algorithms)
- ✅ Check: Each algorithm is isolated as a separate export object (no shared mutable state)
- ✅ Check: `aesCtr` uses HKDF-SHA256 for key derivation (encryption + MAC keys) — lines 89-90
- ✅ Check: `aesCtr` uses encrypt-then-MAC with constant-time HMAC comparison — lines 117-121
- ✅ Check: `chacha20Poly1305` / `xchacha20Poly1305` / `salsa20Poly1305` use libsodium (WASM) — intensively audited
- ℹ️ Note: `aesGcm` imports `CryptoKey` on each call (performance trade-off for isolation)

#### `utils/vaultStorage.ts` (Encrypted Key Storage)
- ✅ Check: `saveAll()` encrypts JSON with `cryptoService.encryptString()` — line 89
- ✅ Check: `getAll()` decrypts before returning — lines 68-86
- ✅ Check: Legacy plaintext format is migrated to encrypted on first save

#### `utils/db.ts` (IndexedDB)
- ✅ Check: File data auto-encrypted on add if `isEncrypted === false` — lines 111-118
- ✅ Check: Metadata auto-encrypted on add if vault key available — lines 94-109
- ✅ Check: Schema migration (v2→v3) creates `encryptedMeta` for existing items

#### `App.tsx` (State Management + Incident Response)
- ✅ Check: `destructTriggerTime` is saved in localStorage (persists between reloads) — line 331
- ✅ Check: `lastActivityRef` is updated on every activity event
- ✅ Check: Recovery codes encrypted with Vault Key — lines 230-240
- ✅ Check: All sensitive states (`settingsPassword`, `vaultPin`) are in `useState`, not global variables
- ✅ Check: Self-destruct clears IndexedDB + localStorage + sessionStorage — lines 299-310

---

## 10. Content Security Policy (CSP)

**File:** `index.html:10`

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'sha256-OEPdcHzvKEr3pZVPkK7qb3CkSklneNEDL1ISFLi6KLc=';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self';
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
```

### CSP Notes
- `'unsafe-eval'` — required for Vite dev mode and WASM libraries (hash-wasm, libsodium-wrappers)
- `'unsafe-inline'` for styles — required for Tailwind CSS and Framer Motion dynamic styles
- `'wasm-unsafe-eval'` — allows WASM execution (hash-wasm, libsodium-wrappers)
- SHA-256 hash for inline script in `index.html` — if the inline script changes, the hash must be updated
- **Tauri override**: `src-tauri/tauri.conf.json` sets `"csp": null` — CSP is **disabled** in Tauri desktop builds. This is a known limitation.

---

## 11. Dependencies

### Runtime Dependencies: Cryptographic (2)
| Package | Version | Purpose |
|---------|---------|---------|
| `hash-wasm` | ^4.12.0 | Argon2id implementation (WASM) |
| `libsodium-wrappers` | ^0.8.2 | ChaCha20, XChaCha20, Salsa20-Poly1305 (WASM) |

### Runtime Dependencies: Other (32)
- `@fontsource/*` (20 packages, ^5.2.x) — Fonts
- `@heroicons/react` ^2.0.18 — Icons
- `@tauri-apps/api` ^2.0.0 — Tauri desktop bridge
- `framer-motion` ^10.16.4 — Animations
- `lucide-react` ^0.292.0 — Icons
- `react` ^18.2.0 — UI framework
- `react-dom` ^18.2.0 — DOM rendering
- `react-icons` ^4.11.0 — Icons

### Transitive CVE Overrides
```
@xmldom/xmldom → ^0.8.13
glob → ^10.4.5
rimraf → ^5.0.10
minimatch → ^10.2.5
uuid → ^14.0.0
```
These ensure transitive dependencies with known CVEs are updated to patched versions.

---

## 12. Cryptographic Code Governance

CrytoTool's cryptographic code is **strictly governed** to ensure the safety of people's data:

- **Only the project architect or approved external security auditors** may modify, add, or remove encryption algorithms, key derivation functions, or cryptographic primitives.
- **Contributors must not submit PRs** that touch `utils/crypto.ts`, `utils/cryptoPrimitives.ts`, `utils/streamCrypto.ts`, `utils/backupCrypto.ts`, `utils/metadataCrypto.ts`, `utils/vaultStorage.ts`, `utils/security.ts`, `utils/db.ts`, or any file containing encryption or security logic.
- **Vulnerability reporting**: If you discover a cryptographic flaw, report it via the [Security Vulnerability template](https://github.com/ObscuritySecurity/CrytoTool/issues/new?template=security_vulnerability.md) or [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) for critical issues.
- **Rationale**: Encryption is the foundation of trust. A single mistake in key derivation or algorithm implementation can compromise all people's data. Restricting crypto changes to the architect and approved auditors minimizes this risk.

---

## 13. Known Limitations

1. **No professional security audit** has been performed on the codebase
2. **CSP disabled in Tauri desktop builds** (`tauri.conf.json` sets `"csp": null`)
3. **`'unsafe-eval'` in CSP** — required for WASM crypto libraries; weakens XSS protection
4. **Recovery code generation has slight bias** — `randomValues[j] % chars.length` where 256 is not divisible by 24, resulting in ~0.4% per-character bias
5. **Backup PIN key mismatch** — `BackupView.tsx:48` reads `crytotool_vault_pin` but the actual key is `crytotool_vault_pin_hash`; vault PIN is not properly backed up
6. **Legacy PIN formats still supported** — old SHA-256 hex (64 chars) and direct string comparison PINs are accepted for backward compatibility
7. **Metadata fallback to plaintext** — if vault key is unavailable during `addItem`, metadata is stored unencrypted (`db.ts:107`)
8. **IndexedDB export/import has no integrity check** — `db.exportDatabase()` and `db.importDatabase()` don't verify data integrity or authenticity

---

## Checklist for Security Review

Before releasing a new version, verify:

- [ ] `npm audit` — zero high/critical vulnerabilities
- [ ] Argon2id params unchanged (memory: 131072, iterations: 19, parallelism: 4)
- [ ] AES-GCM IV is randomly generated for each encryption (12 bytes)
- [ ] Vault Key is cleared from memory on lock (`cryptoService.clearKeys()`)
- [ ] `vaultStorage` saves keys encrypted (check localStorage for `crytotool_vault_keys` — should be `{iv, data}`, not plaintext)
- [ ] PIN hash in localStorage is encrypted with Vault Key (check `crytotool_vault_pin_hash`)
- [ ] Recovery codes in localStorage are encrypted with Vault Key (check `crytotool_recovery_codes`)
- [ ] Progressive Lockout works (test 3+ failed attempts)
- [ ] Self-Destruct can be triggered manually and automatically
- [ ] Recovery codes display correctly and work
- [ ] No "users" term in UI (use "people" / "persoane")
- [ ] CSP meta tag is present in `index.html`
- [ ] No cryptographic code was modified without architect approval

---

## External Resources
- **OWASP Top 10 Client-Side Security Risks**: https://owasp.org/www-project-top-10-client-side-security-risks/
- **Web Crypto API Security**: https://www.w3.org/TR/WebCryptoAPI/
- **Argon2 Specification**: https://github.com/P-H-C/phc-winner-argon2
- **IndexedDB Security (Firefox Private Mode Research)**: https://dfrws.org/wp-content/uploads/2024/07/Decrypting-IndexedDB-in-private-mode-o_2024_Forensic-Science-International-.pdf

---

## Reporting Security Issues
If you discover a vulnerability, report it through the [Security Vulnerability template](https://github.com/ObscuritySecurity/CrytoTool/issues/new?template=security_vulnerability.md) or [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) for critical issues. We respect the people who help us become more secure.
