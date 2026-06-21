# CrytoTool Vault - Agent Instructions

## Build & Verify

```bash
npm run dev        # Vite dev server at http://localhost:5173 (HTTPS if key.pem+cert.pem present)
npm run build:wasm # wasm-pack build crypto-core --target web --out-dir pkg
npm run build      # tsc --noEmit + vite build (the only CI gate; no separate lint/test)
npm run tauri      # Build Tauri desktop app (delegates to `tauri` CLI)
npx tsc --noEmit   # The only static check; required by PR template
```

`npm run build:wasm` must run before `npm run build` to compile the Rust crypto crate to WASM. `npx tsc --noEmit` is the only static check; `npm run build` is the only verification before opening a PR. The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires `npx tsc --noEmit` to pass.

## What is CrytoTool

- **Project name:** CrytoTool
- **npm name:** `crytotool-vault` (`package.json` line 2, `"private": true`)
- **Tauri product name:** `CrytoTool`
- **Tauri identifier:** `com.crytotool.vault`
- **Version:** `2.5.0-beta` (synced across `package.json`, `src-tauri/tauri.conf.json`; `src-tauri/Cargo.toml` uses `2.5.0`)
- **Repo:** `https://github.com/ObscuritySecurity/CrytoTool`
- **Owner / Architect:** `wtshex1` (per `README.md` line 49)
- **AI agent:** `Scuris` — autonomous agent that implements features, documentation, and fixes
- **License:** `AGPL-3.0`
- **Tagline:** "All-in-One Privacy — no tracking, no ads, no data collection"
- **Mission:** "CrytoTool respects the people behind the screen. It's a four-in-one, client-side encrypted file manager, gallery, music player, and document viewer where your privacy comes first."
- **Made in:** `🇷🇴 Made with ❤️ in România`

## Supported Platforms

| Platform | Status | Notes |
| --- | --- | --- |
| Linux | ✅ Universal AppImage | Built on `ubuntu-24.04` via `quick-sharun` + `appimagetool`. Portable across Arch, Ubuntu 14.04+, Fedora 43+, musl/Alpine, NixOS. |
| macOS | ✅ DMG + APP | Matrix builds `aarch64` and `x86_64` on `macos-latest`. |
| Windows | ✅ MSI + EXE | Patches `tauri.conf.json` from `2.5.0-beta` → `2.5.0` for MSI metadata. |
| Android | ✅ Universal APK | Builds 4 targets, signs with `release.keystore`. Java 17 + Android SDK 35. |
| iOS | ⚠️ Partial | Icons exist in `src-tauri/icons/ios/`, bundle target `"all"` declared, but **no `tauri-ios.yml` workflow**. |
| Web | ✅ Dev only | Vite dev server on port 5173. HTTPS auto-enabled if `key.pem` + `cert.pem` exist. |

## Technology Stack (detailed)

### Frontend
- **React:** `^19.2.7` + **React DOM:** `^19.2.7`
- **TypeScript:** `^5.2.2` (devDep) — target `ES2020`, `strict: true`
- **Vite:** `^8.0.16` (devDep) + `@vitejs/plugin-react: ^6.0.2`
- **Tailwind CSS:** `^3.3.5` (devDep) + `autoprefixer: ^10.4.16` + `postcss: ^8.5.15`
- **Animation:** `framer-motion: ^12.40.0`
- **Icons:** `lucide-react: ^1.18.0`, `react-icons: ^4.11.0`, `@heroicons/react: ^2.0.18`
- **Fonts (self-hosted via `@fontsource`):** 17 packages — inter, jetbrains-mono, fira-code, space-mono, poppins, nunito, roboto, open-sans, montserrat, quicksand, lora, merriweather, playfair-display, oswald, orbitron, cinzel, caveat, pacifico, lobster, dancing-script, rubik
- **Image processing:** `sharp: ^0.35.1` (devDep, used by Tauri icon generator)
- **Types:** `@types/react: ^19.2.17`, `@types/react-dom: ^19.2.3`, `@types/node: ^25.9.3`

### Backend / Tauri
- **Tauri (npm):** `@tauri-apps/api: ^2.0.0`, `@tauri-apps/cli: ^2.11.2` (devDep)
- **Tauri (Rust crate):** `tauri = "2"`, `tauri-build = "2"`
- **Rust edition:** `2021`
- **Runtime deps:** `serde 1.0` (with `derive`), `serde_json 1.0`, `crypto-core` (path crate), `tauri-plugin-keyring` (non-Android), `jni 0.21` (Android)
- **Features:** only `custom-protocol` (production builds)
- **Rust surface:** 38 Tauri commands (all crypto operations, biometric, key wrapping, etc.) — listed in `src-tauri/src/lib.rs`. `withGlobalTauri: false`, but JS invokes commands via `@tauri-apps/api/core` invoke().
- **Linux runtime env:** `WEBKIT_DISABLE_DMABUF_RENDERER=1` + `WEBKIT_DISABLE_COMPOSITING_MODE=1` set before `tauri::Builder::default()`.

### Crypto
- **All crypto runs in Rust `crypto-core/` crate**, compiled to WASM (for browser/webview) and linked natively (for Tauri desktop).
- **Argon2id:** via `argon2` Rust crate (native, no WASM overhead)
- **Algorithms:** AES-256-GCM (aes-gcm crate), AES-CTR + HMAC-SHA256 (aes + ctr + hmac + sha2 + hkdf + subtle crates), ChaCha20-Poly1305 (chacha20poly1305 crate), XChaCha20-Poly1305 (chacha20poly1305 crate), Salsa20-Poly1305/ XSalsa20+Poly1305 (xsalsa20poly1305 crate)
- **Streaming chunk size:** `4 * 1024 * 1024` (4 MB), magic header `'CRYTO_STREAM'`, version `1` (`crypto-core/src/stream.rs`)
- **Argon2id params (`crypto-core/src/threat_model.rs`):** 4 tier-uri, parametri diferiți per purpose (`master`/`recovery`/`pin`):

  | Tier | Master/Recovery (iters / mem / par) | PIN (iters / mem / par) |
  |------|--------------------------------------|-------------------------|
  | 1 | 2 / 19456 KB / 1 | 2 / 32768 KB / 1 |
  | 2 | 3 / 65536 KB / 1 | 3 / 65536 KB / 1 |
  | 3 | 10 / 131072 KB / 1 | 10 / 131072 KB / 1 |
  | 4 | 19 / 262144 KB / 1 | 19 / 262144 KB / 1 |

  Paralelismul e mereu 1 (single-threaded WASM constraint). Se aleg prin `get_argon_params(purpose, tier)`.
- **Backup passphrase:** 26 chars from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (130 bits entropy, unbiased sampling)
- **Backup file format:** `[16-byte salt][12-byte IV][ciphertext + 16-byte GCM tag]`
- **JS bridge:** `crypto-core/index.ts` (269 lines) wraps `pkg/crypto_core.js` (wasm-bindgen output) with 50+ exported functions

### Storage
- **IndexedDB:** Via `crypto-core/db.ts` (305 lines). `DB_NAME = 'CrytoToolVault'`, `DB_VERSION = 3`, single object store `'files'`. Methods: `init, addItem, updateItem, getAllItems, deleteItem, clearDatabase, exportDatabase, importDatabase`. v3 migration encrypts legacy metadata. On addItem/updateItem, metadata is encrypted via `metadata_encrypt()` and fileData via `encrypt()`.
- **localStorage keys:**
  - `crytotool_salt`, `crytotool_vault_wrappers` (master + recovery key wrappers)
  - `crytotool_crypto_metadata` (master_salt + recovery_salts + tier)
  - `crytotool_blur_time`, `crytotool_lock_time`, `crytotool_prog_lock_time`, `crytotool_prog_attempts`
  - `crytotool_vault_enabled`, `crytotool_vault_pin_hash`, `crytotool_vault_cats`, `crytotool_vault_keys` (encrypted JSON)
  - `crytotool_ad_enabled`, `crytotool_ad_attempts`, `crytotool_ad_inactivity`, `crytotool_ad_countdown`
  - `crytotool_destruct_time`, `crytotool_last_activity`
  - `app_language`, `app_region`, `app_theme_config`, `app_font_config`, `theme_accent`, `app_accent_manual`
- **Randomness:** `window.crypto.getRandomValues` for all IVs/salts in JS layer; `rand` Rust crate inside crypto-core.
- **Biometric:** `utils/biometric.ts` (107 lines) — dual path: desktop via `tauri-plugin-keyring`, Android via JNI (`biometric_android.rs`)

### i18n
- **Total locales:** 51 files (one per language) + 3 support files (`types.ts`, `index.ts`, `i18nContext.tsx`)
- **Location:** `locales/` (top-level directory), not `utils/`
- **Priority languages:** `en` (100%, bundled statically), `ro` (~89.5%), `es` (~93.6%)
- **`TranslationKey` union:** ~520 keys in `locales/types.ts`
- **Fallback:** `currentTranslations[key] || fallback[key] || key`
- **`t()` signature:** `(key: TranslationKey) => string` — no params. Interpolare manuală: `t('key').replace('{{date}}', date)`
- **Loader:** `import.meta.glob` lazy-loads all locale modules
- **Storage key:** `app_language` in localStorage

### Build / CI
- **Build:** `npm run build:wasm` → `npm run build` (tsc + vite build)
- **Dev:** `npm run dev` → `vite` (port 5173)
- **Tauri:** `npm run tauri` → delegates to `@tauri-apps/cli`
- **Type check:** `npx tsc --noEmit`
- **GitHub Actions (7 workflows):**
  - `release.yml` — creates GH release from `docs/CHANGELOG.md` on tag push `v*`
  - `tauri-linux.yml` — quick-sharun + appimagetool
  - `tauri-macos.yml` — matrix aarch64 + x86_64
  - `tauri-windows.yml` — patches version for MSI
  - `tauri-android.yml` — universal APK + signing
  - `npm-audit.yml` — Supply Chain Vigilante
  - `cargo-audit.yml` — Crate Patrol

## Project Structure

```
CrytoTool/
├── AGENTS.md                     # This file
├── App.tsx                       # Root component: 625 lines, state machine, biometric, threat model
├── index.html                    # 136 lines; inline pre-React theme script, glass intensity vars
├── index.tsx                     # 18 lines; mounts <App /> via React 19 createRoot
├── index.css                     # 264 lines; @tailwind directives + safe-area CSS
├── metadata.json                 # 5 lines; landing page metadata
├── package.json                  # 73 lines
├── package-lock.json
├── postcss.config.js             # tailwindcss + autoprefixer
├── tailwind.config.js            # 44 lines; CSS-var-based color system
├── tsconfig.json                 # 33 lines; strict; target ES2020; includes crypto-core
├── types.ts                      # 96 lines; FileSystemItem, ViewState, ThemeConfig, CryptoAlgorithm +
│                                 #   CryptoMetadata, VaultWrappers, ArgonParams, etc.
├── vite.config.ts                # 20 lines; manual HTTPS via key.pem+cert.pem (no vite-plugin-mkcert)
├── vite-env.d.ts
├── LICENSE                       # AGPL-3.0
│
├── crypto-core/                  # Rust WASM crate (inima proiectului — tot crypto-ul e aici)
│   ├── Cargo.toml                # 34 lines; wasm-bindgen + crypto libs
│   ├── src/lib.rs                # 15 module exports
│   ├── src/kdf.rs, aead.rs, aes_ctr.rs, chacha_salsa.rs, stream.rs
│   ├── src/crypto.rs, key_wrapping.rs, backup_crypto.rs, metadata_crypto.rs
│   ├── src/security.rs, threat_model.rs, sanitize.rs, vault_storage.rs
│   ├── src/wasm_bindings.rs      # 307 lines; #[wasm_bindgen] exports
│   ├── index.ts                  # 269 lines; JS bridge importing from pkg/crypto_core.js
│   ├── db.ts                     # 305 lines; IndexedDB wrapper (VaultDB class)
│   └── pkg/                      # WASM build output (crypto_core.js + .wasm + .d.ts)
│
├── components/                   # 20 .tsx files
│   ├── AuthScreen.tsx            # 1390 lines; unlock/setup/recovery/biometric
│   ├── AutoDestructCountdown.tsx # 94 lines; self-destruct countdown timer
│   ├── CopyMoveModal.tsx
│   ├── CustomColorPicker.tsx     # HSL accent picker
│   ├── CustomizeModal.tsx        # 623 lines; theme/font/language customization
│   ├── CustomSelect.tsx
│   ├── Dashboard.tsx             # 1203 lines; main shell, modals, view router
│   ├── DecryptModal.tsx          # 315 lines; manual decryption UI
│   ├── EncryptionModal.tsx       # 536 lines; 6 algorithms, hardware tiers
│   ├── FileActionMenu.tsx
│   ├── FileItem.tsx              # 244 lines; file/folder card
│   ├── FullPlayer.tsx            # full-screen music player
│   ├── LandingPage.tsx           # 233 lines; marketing page
│   ├── LiquidGlassOverlay.tsx    # animated glass border overlay
│   ├── PinModal.tsx              # 201 lines; 6-digit PIN vault
│   ├── RecoveryCodesModal.tsx    # 69 lines; shows 10 codes + download
│   ├── SplashScreen.tsx          # 147 lines; animated SVG lock + checkmark
│   ├── TopActions.tsx
│   ├── ui.tsx                    # 662 lines; shared Button/Modal/Menu/Toggle/Input/Select/Chip/Badge
│   └── views/                    # 8 full-page views
│       ├── BackupView.tsx        # 425 lines; backup & restore
│       ├── GalleryView.tsx       # 207 lines; photos + videos + favorites + albums
│       ├── MusicView.tsx         # 180 lines; songs/albums/artists/playlists
│       ├── SearchView.tsx        # 87 lines; cross-vault search
│       ├── SettingsView.tsx      # 1150 lines; security, themes, fonts, language, about
│       ├── StorageView.tsx       # 95 lines; storage breakdown by category
│       ├── TrashView.tsx         # 87 lines; restore or delete-forever
│       └── VaultView.tsx         # 353 lines; encryption key storage with categories
│
├── docs/                         # 9 markdown files
│
├── locales/                      # 54 files (51 locales + types + index + context)
│   ├── index.ts                  # 136 lines; LANGUAGES, lazy loader, COMPLETION_PERCENTAGES
│   ├── types.ts                  # 15 lines; TranslationKey union, Translations interface
│   ├── i18nContext.tsx           # 81 lines; I18nProvider + useI18n()
│   ├── en.ts / ro.ts / es.ts     # 630 / 633 / 633 lines; priority languages
│   └── [48 other locale files]
│
├── utils/                        # 1 file
│   └── biometric.ts              # 107 lines; keyring + JNI biometric unlock
│
├── styles/                       # 4 files (+ __tests__/ dir)
│   ├── glass.css                 # 603 lines; glassmorphism design system
│   ├── themes.ts                 # 78 lines; 100 theme generator
│   ├── fonts.ts                  # 137 lines; font config
│   └── fonts-imports.ts
│
├── src-tauri/                    # Tauri Rust desktop/mobile backend
│   ├── Cargo.toml                # 30 lines
│   ├── tauri.conf.json           # 39 lines; productName, identifier, transparent window
│   ├── build.rs
│   ├── crytotool.desktop
│   ├── src/
│   │   ├── main.rs               # 6 lines
│   │   ├── lib.rs                # 276 lines; 38 Tauri commands + WebKit workarounds
│   │   └── biometric_android.rs  # 88 lines; JNI biometric for Android
│   ├── capabilities/
│   │   └── default.json          # keyring:default permission
│   └── icons/                    # 25+ icons including android/ + ios/
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   ├── dependabot.yml
│   └── workflows/                # 7 CI files
│       ├── release.yml
│       ├── tauri-linux.yml, tauri-macos.yml, tauri-windows.yml, tauri-android.yml
│       ├── npm-audit.yml, cargo-audit.yml
│
├── vitest.config.ts              # 12 lines; vitest + jsdom + testing-library
├── assets/                       # 5 PNG images for README
└── node_modules/
```

## Architecture

### Root state machine — Splash → Auth → Dashboard

`App.tsx` (625 lines) owns the top-level state machine and wraps everything in `<I18nProvider>`. Transitions use `AnimatePresence`.

### `App.tsx` role
- **State:** `isSetupRequired`, `autoBlurSeconds` (20), `autoLockSeconds` (25), `isBlurred`, `settingsPassword`, `vaultEnabled`, `vaultPin`, `progressiveLockSeconds` (60), `failedAttemptsThreshold` (3), `autoDestructEnabled`, `autoDestructAttempts` (5), `autoDestructInactivity` (0), `destructCountdownSeconds` (30), `biometricAvailable`, `biometricEnabled`, `newlyGeneratedCodes`, `failedAttempts`, `lockUntil`.
- **Master key:** `masterKeyRef: useRef<Uint8Array | null>` (raw bytes, not CryptoKey)
- **Two inactivity timers:** one for authenticated state (blurs → locks → wipes), one for auth screen (wipes if inactivity exceeded).
- **Self-destruct:** `AutoDestructCountdown` component with `destructRef`
- **`performWipe()`:** `db.clearDatabase()` + localStorage.clear() + sessionStorage.clear() + setVaultKey(null) + reload
- **`applyThreatModel(config)`:** writes all settings to localStorage from a tier config object
- **Biometric unlock:** on mount, checks biometric availability, attempts auto-unlock via keyring
- **Imports from:** `crypto-core/index` (derive_key, wrap_raw_key, unwrap_raw_key, base64, generate_recovery_codes, parse_code_index, get_argon_params, pin_hash), `crypto-core/db` (db, setVaultKey), `utils/biometric` (checkBiometricAvailability, retrieveMasterKeyBiometric, etc.)

### Auth flow — `components/AuthScreen.tsx` (1390 lines)
- **Props:** `onUnlock, isSetup, lockUntil, onFailedAttempt, recoverySettings, onResetWithRecovery, destructRef, onDestructComplete, onApplyThreatModel, onSetupComplete, biometricAvailable, biometricEnabled, onBiometricUnlock, onStoreMasterKey, onNewCodes`
- **Modes:** `setup` (master password + confirm + threat model tier selection) and `unlock` (password or biometric)
- **Recovery:** enter code + new password → `resetMasterPasswordWithRecovery()`
- **Key derivation:** `derive_master_key(password, salt, isMobile)` → `wrap_raw_key(mvk, masterKey)` → localStorage
- **Threat model setup:** 4 tier-uri with different Argon2id params + feature toggles

### View router — `Dashboard.tsx` (1203 lines)
- **`ViewState`:** `'dashboard' | 'search' | 'trash' | 'settings' | 'storage' | 'themes' | 'fonts' | 'about' | 'vault'`
- **Owns:** file-system CRUD (`crypto-core/db.ts`), modal state, play-queue, all settings forwarding

### Modal pattern
- z-index: blur overlay `z-[100]`, modals `z-[150]`, recovery modal `z-[200]`, splash `z-[9999]`
- Shared primitives in `ui.tsx` (662 lines): Button, Modal, Menu, Toggle, Input, Select, Chip, Badge, Panel, Divider, Slider, Switch

### Crypto — `crypto-core/` Rust crate
All encryption, decryption, key derivation, metadata encryption, backup, PIN, sanitization runs through a single Rust crate compiled to WASM. JS imports from `crypto-core/index.ts` which wraps wasm-bindgen bindings. Tauri desktop builds link the same crate natively and expose 38 commands via `#[tauri::command]`.

### Tauri commands (38 total)
`src-tauri/src/lib.rs` registers: `greet`, `check_biometric_available`, `authenticate_biometric`, `derive_key`, `aes_gcm_encrypt/decrypt`, `aes_ctr_encrypt/decrypt`, `chacha20_poly1305_encrypt/decrypt`, `xchacha20_poly1305_encrypt/decrypt`, `salsa20_poly1305_encrypt/decrypt`, `stream_encrypt/decrypt`, `random_bytes`, `base64_encode/decode`, `generate_passphrase`, `generate_recovery_codes`, `encrypt_with_passphrase/decrypt_with_passphrase`, `encrypt/decrypt`, `encrypt_string/decrypt_string`, `backup_encrypt/decrypt`, `wrap_raw_key/unwrap_raw_key`, `metadata_encrypt/decrypt`, `pin_hash/pin_verify`, `get_argon_params`.

### Biometric
Dual-path: desktop via `tauri-plugin-keyring` (stores master key in OS keychain), Android via JNI (`biometric_android.rs` → `BiometricHelper`). JS orchestrates via `utils/biometric.ts`.

### i18n
`locales/i18nContext.tsx` provides `I18nProvider` and `useI18n()` hook. 51 languages, `en` statically bundled, others lazy-loaded via `import.meta.glob`.

## Features by Section

### Settings — `components/views/SettingsView.tsx` (1150 lines)
Themes (100, 10 categories), fonts (40+, 6 categories), custom accent (HSL picker), language + region, security panel (master password 30+ chars, settings password, auto-blur/lock, progressive lockout, self-destruct, vault PIN, recovery codes), about.

### Vault — `components/views/VaultView.tsx` (353 lines)
Encrypted key storage with categories. Persisted via `crypto-core/src/vault_storage.rs` through WASM bindings.

### Backup — `components/views/BackupView.tsx` (425 lines)
6-step state machine. Create: generate 26-char key → `backup_encrypt()` → download. Restore: pick `.enc` + key → `backup_decrypt()` → validate → restore whitelisted localStorage keys + `db.importDatabase()`.

### Music / Gallery / Search / Storage / Trash
See view components in `components/views/`.

## Limitations — You MUST NOT Touch Crypto Without Approval

**CRITICAL:** Only `wtshex1` and approved security auditors may modify crypto code. Contributors MUST NOT modify any files in `crypto-core/src/*.rs`. The PR template makes "PR does NOT modify cryptographic code, key derivation, or encryption algorithms" a blocking checklist item.

**Off-limits (all in `crypto-core/src/`):**
- `kdf.rs` — Argon2id key derivation
- `aead.rs` — AES-256-GCM
- `aes_ctr.rs` — AES-CTR + HMAC-SHA256
- `chacha_salsa.rs` — ChaCha20/XChaCha20/Salsa20
- `stream.rs` — 4MB chunked streaming
- `crypto.rs` — Composite ops (encrypt/decrypt, base64, etc.)
- `key_wrapping.rs` — Recovery codes, wrap/unwrap
- `backup_crypto.rs` — Backup encrypt/decrypt
- `metadata_crypto.rs` — Metadata encryption
- `security.rs` — PIN hash/verify
- `threat_model.rs` — Argon2id params
- `sanitize.rs` — URL sanitization
- `vault_storage.rs` — Key storage
- `wasm_bindings.rs` — WASM exports

Also forbidden:
- Changing **Argon2id parameters** in `threat_model.rs`
- Changing the **chunk size** in `stream.rs` (`4 * 1024 * 1024`)
- Changing IV lengths in `aead.rs`, `aes_ctr.rs`, `chacha_salsa.rs`
- Changing the **recovery code alphabet** or format in `key_wrapping.rs`
- Changing the **backup passphrase alphabet** or entropy budget in `backup_crypto.rs`
- Changing the **backup file binary format** (salt/IV/ciphertext ordering)

If a fix is needed in crypto code, **describe the change in an issue and ask the architect** — never commit it directly.

## Design Conventions

### People-first language (mandatory)
- **"persoane"** (RO) / **"people"** (EN) / localized equivalent
- **Never** "utilizatori" (RO) / "users" (EN) in UI text

### Terminology
| Wrong | Correct |
| --- | --- |
| users / utilizatori / usuarios | people / persoane / oameni / personas |
| login / logout | unlock / lock |
| password | master password |
| password reset | recovery code flow |

### Code style
- TypeScript strict mode, English comments only, React hooks, conventional commits
- Version sync: `package.json` and `tauri.conf.json` = `2.5.0-beta`, `Cargo.toml` = `2.5.0`
- No comments unless asked

### i18n rules
- Use `t('key')`, never hardcode strings
- New keys → `TranslationKey` union + `en.ts` + `ro.ts` + `es.ts`
- Placeholder convention: `{{name}}`

### No telemetry
Nothing leaves the device. No server, no network calls.

### Theme system
100 themes (10 categories), 40+ fonts (6 categories), glassmorphism (`styles/glass.css`), accent default `#E8E8E8` (Matte Metallic White), dark/light/system modes.

### Animation
Framer Motion `AnimatePresence`. Page: `{ opacity: 0, x: 50 }` → `{ opacity: 1, x: 0 }`. Modal: `{ opacity: 0, scale: 0.9, y: 20 }` → `{ opacity: 1, scale: 1, y: 0 }`.

### Accessibility
4.5:1 contrast, keyboard nav, `aria-label` for icon buttons, `aria-live="polite"`, `role="dialog"`.

### Mobile-first responsive
375px–1920px breakpoints. Touch targets: `p-3` minimum.

## Respecting Templates

### PR template
Mandatory: Summary (Issue/Type/Platform), Changes, Protocol-3305 table (9 articles, exact 4 columns), Checklist.

### Protocol-3305 — the 9 articles
| Art. | Principle |
| --- | --- |
| 0 | Ethical Monetization |
| 1 | Privacy by Design |
| 2 | Security by Default |
| 3 | Zero Trust |
| 4 | Zero Knowledge |
| 5 | Zero Personal Data Collection |
| 6 | Zero Activity Logs |
| 7 | Open Source |
| 8 | Zero Non-Essential Permissions |

### Bug report template
Prefix `[Bug]`, label `bug`. Sections: Describe/Reproduce/Expected/Screenshots/Environment. Security checkbox.

### Feature request template
Prefix `[Feature]`, label `enhancement`. Protocol-3305 checkboxes. Platform targeting. I18n impact.

### Build & verify (at-a-glance)
```bash
npm run dev        # Vite dev server (HTTPS if key.pem+cert.pem)
npm run build:wasm # wasm-pack build crypto-core
npm run build      # tsc --noEmit + vite build
npx tsc --noEmit   # Type check
```

---

## ⚠️ GIT & GITHUB — Scuris Autonomy Rules

**Scuris is authorized to autonomously commit, push, and open Pull Requests without prior approval from `wtshex1`.** This is the default operating mode.

### ✅ ALWAYS ALLOWED (autonomous)
- `git commit`, `git push` to feature/fix/docs branches (never `main`)
- Opening a new PR, editing/updating Scuris's own open PRs
- `git log`, `git diff`, `git status`, `git branch` (read-only)
- Reading/searching files, codebase, GitHub issues/PRs
- Running build / type-check commands locally
- Proposing plans and asking questions

### ❌ FORBIDDEN (require explicit `wtshex1` approval)
- Pushing directly to `main`, merging/squashing/rebasing a PR
- Force-pushing to any branch
- Deleting any branch (local or remote)
- Creating, moving, or deleting a tag
- Publishing or updating a GitHub Release
- `git commit --amend` after a failed CI run
- Closing or reopening someone else's PR/issue
- Any operation on `main` that bypasses PR workflow

### 📝 APPROVAL FORMAT
Explicit `DA` / `OK` / `go` / `merge` / `yes` from `wtshex1`. If silent or ambiguous — DO NOTHING.
