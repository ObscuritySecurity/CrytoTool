# Changelog

All notable changes to CrytoTool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0-PRO] - 2026-05-05

### Security
- **CRITICAL**: Fixed streaming encryption nonce collision vulnerability — replaced shared-prefix counter with HMAC-SHA256-based nonce derivation (`streamCrypto.ts`)
- **HIGH**: Replaced BLAKE2b with Argon2id for passphrase-based key derivation in manual encryption (`crypto.ts`)
- **HIGH**: Increased master key Argon2id memory from 64MB to 128MB, removed deprecated `memory` parameter (`crypto.ts`)
- **MEDIUM**: Replaced non-standard HKDF construction with WebCrypto native HKDF for AES-CTR key derivation (`cryptoPrimitives.ts`)
- **MEDIUM**: Increased PBKDF2-SHA256 iterations from 100,000 to 600,000 for backup key derivation (`backupCrypto.ts`)

### Changed
- Manual encryption KDF: Argon2id (19 iterations, 128MB memory) instead of single-pass BLAKE2b
- Streaming encryption KDF: Argon2id (19 iterations, 128MB memory) instead of BLAKE2b
- AES-CTR HKDF: Now uses standard WebCrypto HKDF-SHA256 with IV as salt

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
