# Changelog

All notable changes to CrytoTool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0-beta] - 2026-05-27

### First Official Beta Release

CrytoTool is a four-in-one, client-side encrypted file manager, gallery, music player, and document viewer. Zero tracking, zero ads, zero data collection. Fully compliant with [Protocol-3305](https://github.com/ObscuritySecurity/protocol-3305).

### Encryption System — 4 Layers

- **Layer 1 — Database Encryption (IndexedDB):** Every file stored in IndexedDB is auto-encrypted with AES-256-GCM. Master key derived from the person's Master Password via Argon2id (128MB memory, 19 iterations, 4-way parallelism).
- **Layer 2 — File & Folder Encryption:** Manual encryption supporting 6 algorithms: AES-256-GCM, XChaCha20-Poly1305, ChaCha20-Poly1305, AES-CTR (256-bit), Salsa20-Poly1305, AES-GCM-Stream.
- **Layer 3 — Encrypted Backup:** Full vault backups protected with Argon2id + AES-256-GCM and a unique 26-character key.
- **Layer 4 — Streaming Encryption:** Large files processed in 4MB chunks with per-chunk AES-GCM encryption, safe for low-RAM devices.

### Security Features

- **Master Password (30+ characters)** — vault-wide encryption gate
- **Settings Password** — separate optional password for sensitive settings
- **Progressive Lockout** — increasing delays after failed attempts (configurable)
- **Self-Destruct** — database auto-wipe after configurable failed attempts
- **Auto-Lock & Visual Obfuscation** — blur + lock after inactivity
- **Dead Man Switch** — auto-blur, auto-lock, auto-destruct on prolonged inactivity
- **Unique Key Per File/Folder** — each item encrypted with its own AES-256-GCM key
- **10 Recovery Codes** — single-use emergency access codes
- **PIN Blacklist** — common/weak PINs blocked
- **Encrypted Backup Key** — separate key for backup protection

### Key Management

- **Master Key Derivation:** Argon2id (128MB memory, 19 iterations, 4 parallelism) via hash-wasm
- **Passphrase KDF:** Argon2id (128MB memory, 19 iterations) for manual file encryption
- **Backup KDF:** Argon2id + AES-256-GCM with 600,000 PBKDF2-SHA256 iterations
- **Streaming KDF:** Argon2id (128MB memory, 19 iterations)
- **AES-CTR Key Derivation:** WebCrypto native HKDF-SHA256
- **Streaming Nonces:** HMAC-SHA256-based per-chunk derivation (prevents collision)

### File Management

- File manager with add, rename, duplicate, move, copy, download, encrypt, decrypt
- Folder organization with custom icons and categories
- Search across all files and folders
- Trash system with restore capability
- Storage overview by file type (photos, videos, music, documents)

### Multiple Views

- **Gallery** — photos and videos with favorites and albums
- **Music** — audio playback with albums, artists, playlists
- **Documents** — view standard document formats
- **Vault** — categorized encryption key storage

### Customization

- **100 themes** across multiple categories
- **40+ fonts** across multiple categories (21 imported, 123 defined)
- **10+ icon packs** for folders and files (or upload your own)
- **Dark / Light / System mode**
- **Custom accent color** via built-in color picker
- **Custom labels** for file organization

### Internationalization

- **51 languages** fully translated
- Interface adapts to locale automatically

### Cryptographic Libraries

- **[Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)** — AES-256-GCM encryption, random IV generation, CryptoKey management
- **[hash-wasm](https://github.com/Daninet/hash-wasm)** — Argon2id (128MB memory, 19 iterations)
- **[libsodium-wrappers](https://github.com/jedisct1/libsodium.js)** — ChaCha20, XChaCha20, Salsa20, BLAKE2b
- **[NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38d.pdf)** — AES-GCM standard

### Platform Support

- **Desktop:** Windows (MSI, NSIS), Linux (AppImage, deb, rpm), macOS (DMG, APP) — via Tauri
- **Mobile:** Android (APK), iOS (IPA) — via Capacitor
- **Web:** Any browser with Web Crypto API support — via Vite

### Architecture

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Desktop:** Tauri 2 (Rust + WebView)
- **Mobile:** Capacitor (React Native wrapper)
- **Storage:** IndexedDB + localStorage (100% client-side, zero server)
- **Build:** TypeScript strict mode, `npx tsc --noEmit` for type-checking

### Compliance

- ✅ **Protocol-3305** — full compliance (Art. 0–8)
- ✅ **Zero Knowledge** — server has zero access to content
- ✅ **Zero Tracking** — no analytics, no telemetry, no data collection
- ✅ **Open Source** — AGPL-3.0, publicly auditable
- ✅ **Security by Default** — highest settings enabled out of the box
- ✅ **Privacy by Design** — privacy integrated from day one

### Known Limitations (Beta)

- No professional third-party security audit yet (planned for future)
- iOS build requires macOS + Apple Developer account
- Some edge cases in streaming encryption for files >4GB
- Backup restore not yet tested across all platform combinations

---

## [2.5.0-PRO] - 2026-05-01

### Added
- Security Documentation (`SECURITY.md`) with threat model, attack surface, and audit guidelines
- UI/UX Design Standards (`DESIGN.md`) with people-first terminology rules
- Technical Architecture (`architecture.md`) with 4-layer encryption model
- Glassmorphism design system (`styles/glass.css`)
- 50+ language support via `utils/i18n.ts`
- Theme gallery with custom accent color picker
- Streaming encryption for large files (4MB chunks, AES-GCM per chunk)
- Encrypted backup system (Argon2id + AES-256-GCM)
- Progressive lockout (3+ failed attempts trigger increasing delays)
- Self-Destruct mechanism (auto-wipe after failed attempts or inactivity)
- Dead Man Switch (auto-blur, auto-lock, auto-destruct on inactivity)
- Recovery codes system (10 single-use codes for account recovery)
- PIN unlock option with secure hashing (SHA-256 + salt)
- 6 encryption algorithms: AES-GCM, XChaCha20-Poly1305, ChaCha20-Poly1305, AES-CTR, Salsa20-Poly1305, AES-GCM-Stream
- Post-release security hardening (2026-05-05):
  - Fixed streaming encryption nonce collision vulnerability — replaced shared-prefix counter with HMAC-SHA256-based nonce derivation
  - Replaced BLAKE2b with Argon2id for passphrase-based key derivation in manual encryption
  - Increased master key Argon2id memory from 64MB to 128MB
  - Replaced non-standard HKDF construction with WebCrypto native HKDF for AES-CTR key derivation
  - Increased PBKDF2-SHA256 iterations from 100,000 to 600,000 for backup key derivation
  - Manual encryption KDF: Argon2id (19 iterations, 128MB memory) instead of single-pass BLAKE2b
  - Streaming encryption KDF: Argon2id (19 iterations, 128MB memory) instead of BLAKE2b
  - AES-CTR HKDF: Now uses standard WebCrypto HKDF-SHA256 with IV as salt
- Gallery view for images, Music view for audio files
- Trash system with restore capability
- Search across all files and folders
- Copy/move files between folders
- Custom folder icons and categories

### Changed
- **Security**: Vault keys in localStorage now encrypted with Vault Key (AES-256-GCM)
- **Security**: PIN hash in localStorage now encrypted with Vault Key
- **Security**: Recovery codes in localStorage now encrypted with Vault Key
- **Security**: Added Content-Security-Policy meta tag (disallows inline scripts)
- **Terminology**: All UI text uses "people"/"persoane" instead of "users"/"utilizatori"
- **UI**: Complete redesign with glassmorphism aesthetic
- **Performance**: Streaming encryption for low-RAM devices

### Fixed
- TypeScript errors in crypto utilities
- CSS syntax error in glass.css `@supports not` rule
- Import statement syntax errors in security.ts and App.tsx
- Vault key exposure risk (moved to private field in EncryptionService)

### Security
- Argon2id parameters (master key): 128MB memory, 19 iterations, 4 parallelism
- Argon2id parameters (passphrase KDF): 128MB memory, 19 iterations (hash-wasm)
- AES-256-GCM for all vault encryption
- Argon2id (19 iterations, 128MB memory) for backup keys
- WebCrypto native HKDF-SHA256 for AES-CTR key derivation
- HMAC-SHA256-based nonce derivation for streaming encryption chunks
- Zero server communication (100% client-side)
