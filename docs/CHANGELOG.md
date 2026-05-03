# Changelog

All notable changes to CrytoTool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0-PRO] - 2026-05-01

### Added
- Security Documentation (`SECURITY.md`) with threat model, attack surface, and audit guidelines
- UI/UX Design Standards (`DESIGN.md`) with people-first terminology rules
- Technical Architecture (`architecture.md`) with 4-layer encryption model
- Glassmorphism design system (`styles/glass.css`)
- 50+ language support via `utils/i18n.ts`
- Theme gallery with custom accent color picker
- Streaming encryption for large files (4MB chunks, AES-GCM per chunk)
- Encrypted backup system (PBKDF2-SHA256 + AES-256-GCM)
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
- Argon2id parameters: 64MB memory, 10 iterations, 4 parallelism
- AES-256-GCM for all vault encryption
- PBKDF2-SHA256 (100k iterations) for backup keys
- BLAKE2b for manual encryption key derivation
- Zero server communication (100% client-side)
