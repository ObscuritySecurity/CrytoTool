# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CrytoTool Vault is a client-side encrypted file vault built with React, TypeScript, and Vite. It uses Tauri for desktop builds and Capacitor for mobile. All encryption happens in the browser using Web Crypto API and libsodium-wrappers. No server is required - data stays local.

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server on https://localhost:5173

# Building
npm run build            # TypeScript check + Vite build to dist/
npx tsc --noEmit         # TypeScript check only

# Desktop (Tauri)
npm run tauri dev        # Run Tauri desktop app in dev mode
npm run tauri build      # Build desktop release

# Mobile (Capacitor)
npm run cap sync         # Sync web assets to mobile platforms
npm run cap open android # Open Android Studio
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with CSS variables for theming
- **Desktop**: Tauri (Rust) - see `src-tauri/`
- **Mobile**: Capacitor - config in `capacitor.config.json`
- **Crypto**: Web Crypto API + libsodium-wrappers (Argon2id via hash-wasm)
- **Storage**: IndexedDB (files), localStorage (settings/auth)

### Key Directories

```
/components           # React components
  /views              # View components (Settings, Vault, Backup, etc.)
  ui.tsx              # Shared UI primitives (Button, Input, Modal, etc.)
/utils                # Core utilities
  crypto.ts           # Main encryption service (EncryptionService class)
  cryptoPrimitives.ts # Low-level crypto implementations (AES, ChaCha20)
  db.ts               # IndexedDB abstraction (VaultDB class)
  security.ts         # PIN validation, hashing, backoff logic
  themes.ts           # Theme definitions
  fonts.ts            # Font definitions
  i18n.ts             # Translation strings (50+ languages)
  i18nContext.tsx     # React context for translations
/src-tauri           # Rust backend for desktop
```

### State Management

**App.tsx** holds global state:
- Authentication state (`isAuthenticated`, `isSetupRequired`)
- Security settings (auto-blur, auto-lock, progressive lock, auto-destruct)
- Vault settings (vault PIN, enabled status)
- Settings password (kept in memory only, never persisted)

**Security model**:
- Master password derives vault key via Argon2id (never stored)
- Files auto-encrypt with AES-GCM when added to DB
- Manual encryption supports multiple algorithms (AES-GCM, AES-CTR, ChaCha20, XChaCha20, Salsa20)
- Recovery codes stored in localStorage as JSON array
- Vault PIN stored as SHA-256 hash in localStorage

### Crypto Architecture

**High-level** (`utils/crypto.ts`):
- `EncryptionService` class - main API for encrypt/decrypt
- `deriveMasterKey()` - Argon2id key derivation for vault unlock
- `encryptWithPassphrase()` / `decryptWithPassphrase()` - Manual encryption

**Primitives** (`utils/cryptoPrimitives.ts`):
Isolated implementations for auditability:
- `aesGcm` - Web Crypto AES-GCM
- `aesCtr` - Web Crypto AES-CTR with HMAC-SHA256 (Encrypt-then-MAC)
- `chacha20Poly1305` - libsodium ChaCha20-Poly1305
- `xChacha20Poly1305` - libsodium XChaCha20-Poly1305
- `salsa20Poly1305` - libsodium Salsa20-Poly1305

**Database** (`utils/db.ts`):
- `VaultDB` class wrapping IndexedDB
- `DBItem` interface for file/folder metadata
- Auto-encrypts file blobs on `addItem()`
- Export/import with Base64 serialization

### Theming System

Themes defined in `utils/themes.ts` with CSS variables:
- `--accent-color` - Primary accent (neon green default)
- `--bg-main` - Main background
- `--bg-card` - Card backgrounds
- `--bg-surface` - Elevated surfaces
- `--border-color` - Borders
- `--text-main` - Primary text
- `--text-muted` - Secondary text

Themes applied via CSS custom properties on `:root`. See `index.html` for initial theme load (prevents flash).

### Internationalization

- All UI strings in `utils/i18n.ts` (50+ languages)
- Access via `useI18n()` hook from `utils/i18nContext.tsx`
- Language stored in localStorage `crytotool_language`

## Important Conventions

- **Comments**: Write in English only (for international contributors)
- **File paths**: Use `@/` path alias (configured in `tsconfig.json`)
- **Types**: Shared types in `types.ts`, DB types in `utils/db.ts`
- **Version**: 2.5.0-PRO (sync across `package.json` and `src-tauri/Cargo.toml`)
- **No telemetry**: Zero data collection, local-first architecture

## Testing TypeScript

```bash
npx tsc --noEmit
```

Build will fail if TypeScript errors exist. The CI runs this check.
