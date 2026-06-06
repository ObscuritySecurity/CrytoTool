# CrytoTool Vault - Agent Instructions

## Build & Verify

```bash
npm run dev      # Vite dev server at http://localhost:5173 (HTTPS if key.pem+cert.pem present)
npm run build    # tsc --noEmit + vite build (the only CI gate; no separate lint/test)
npm run tauri    # Build Tauri desktop app (delegates to `tauri` CLI)
npx tsc --noEmit # The only static check; required by PR template
```

There are no `test`, `lint`, or `format` scripts. `npx tsc --noEmit` is the only static check; `npm run build` is the only verification before opening a PR. The PR template (`/.github/PULL_REQUEST_TEMPLATE.md`) requires `npx tsc --noEmit` to pass.

## What is CrytoTool

- **Project name:** CrytoTool
- **npm name:** `crytotool-vault` (`package.json` line 2, `"private": true`)
- **Tauri product name:** `CrytoTool`
- **Tauri identifier:** `com.crytotool.vault`
- **Version:** `2.5.0-beta` (synced across `package.json`, `src-tauri/tauri.conf.json`; `src-tauri/Cargo.toml` uses `2.5.0`)
- **Repo:** `https://github.com/ObscuritySecurity/CrytoTool`
- **Owner / Architect:** `wtshex1` (per `README.md` line 49)
- **AI agent:** `Scuris` — autonomous agent that implements features, documentation, and fixes (per `README.md` line 49)
- **License:** `AGPL-3.0` (see `LICENSE`)
- **Tagline:** "All-in-One Privacy — no tracking, no ads, no data collection"
- **Mission:** "CrytoTool respects the people behind the screen. It's a four-in-one, client-side encrypted file manager, gallery, music player, and document viewer where your privacy comes first."
- **Made in:** `🇷🇴 Made with ❤️ in România`

## Supported Platforms

| Platform | Status | Notes |
| --- | --- | --- |
| Linux | ✅ Universal AppImage | Built on `ubuntu-24.04` via `quick-sharun` (pkgforge-dev/Anylinux-AppImages) + `appimagetool` (probonopd/go-appimage continuous #940). Truly portable across Arch, Ubuntu 14.04+, Fedora 43+, musl/Alpine, NixOS. See "Linux Build Strategy" below. |
| macOS | ✅ DMG + APP | `tauri-macos.yml` matrix builds for `aarch64-apple-darwin` AND `x86_64-apple-darwin` on `macos-latest`. Uses `tauri-apps/tauri-action@v0.6`. |
| Windows | ✅ MSI + EXE | `tauri-windows.yml` on `windows-latest`. Patches `tauri.conf.json` from `2.5.0-beta` → `2.5.0` for MSI metadata compatibility. |
| Android | ✅ Universal APK | `tauri-android.yml` builds all 4 targets: `aarch64-linux-android, armv7-linux-androideabi, i686-linux-android, x86_64-linux-android`. Java 17 + Android SDK 35. Signs with `release.keystore` (default storepass `crytotool123` if no secret). |
| iOS | ⚠️ Partial | `src-tauri/icons/ios/` contains 18 iOS app-icon PNGs and `tauri.conf.json` declares bundle targets `"all"`, but **no `tauri-ios.yml` workflow exists** in `.github/workflows/`. README and CHANGELOG reference iOS but CI does not build it. |
| Web | ✅ Dev only | Vite dev server on port `5173`. HTTPS auto-enabled if `key.pem` + `cert.pem` exist (via `vite-plugin-mkcert`). |

`tldr;` for mobile: project is **Tauri v2**, not Capacitor. The `feature_request.md` template incorrectly says "Capacitor" — a known inconsistency.

## Technology Stack (detailed)

### Frontend
- **React:** `^18.2.0` + **React DOM:** `^18.2.0` (mounted via `React 18 createRoot` in `index.tsx`)
- **TypeScript:** `^5.2.2` (devDep) — target `ES2020`, `strict: true` (`tsconfig.json` line 14)
- **Vite:** `^8.0.10` (devDep) + `@vitejs/plugin-react: ^6.0.1` + `vite-plugin-mkcert: ^2.0.0` (HTTPS)
- **Tailwind CSS:** `^3.3.5` (devDep) + `autoprefixer: ^10.4.16` + `postcss: ^8.5.13`
- **Animation:** `framer-motion: ^10.16.4` (used everywhere with `AnimatePresence` / `motion.*`)
- **Icons:** `lucide-react: ^0.292.0`, `react-icons: ^4.11.0`, `@heroicons/react: ^2.0.18`
- **Fonts (self-hosted via `@fontsource`):** 20 packages — `caveat, inter, dancing-script, fira-code, jetbrains-mono, lobster, lora, merriweather, montserrat, nunito, open-sans, orbitron, oswald, pacifico, playfair-display, poppins, quicksand, roboto, rubik, space-mono, cinzel`
- **Image processing:** `sharp: ^0.34.5` (devDep, used by Tauri icon generator)
- **Types:** `@types/react: ^18.2.37`, `@types/react-dom: ^18.2.15`, `@types/node: ^25.6.0`, `@types/prop-types: ^15.7.15`

### Backend / Tauri
- **Tauri (npm):** `@tauri-apps/api: ^2.0.0`, `@tauri-apps/cli: ^2.0.0` (devDep)
- **Tauri (Rust crate):** `tauri = "2"`, `tauri-build = "2"` (`src-tauri/Cargo.toml`)
- **Rust edition:** `2021`
- **Runtime deps:** `serde: 1.0` (with `derive`), `serde_json: 1.0`
- **Features:** only `custom-protocol` (production builds)
- **Mobile entry point:** `#[cfg_attr(mobile, tauri::mobile_entry_point)]` in `src-tauri/src/lib.rs` (Tauri v2 pattern)
- **Rust surface:** a single command `greet(name: &str) -> String`. `withGlobalTauri: false` — JS does **not** use Tauri IPC.
- **Linux runtime env (lib.rs, Linux only):** `WEBKIT_DISABLE_DMABUF_RENDERER=1` + `WEBKIT_DISABLE_COMPOSITING_MODE=1` set before `tauri::Builder::default()` to work around WebKitGTK EGL/DMABUF issues (`tauri-apps/tauri#11994`, `#15050`).

### Crypto
- **Argon2id:** via `hash-wasm: ^4.12.0`
- **Web Crypto API (native):** AES-256-GCM, AES-CTR, HMAC-SHA256, HKDF-SHA256
- **libsodium-wrappers:** `^0.8.2` — ChaCha20-Poly1305 (IETF, RFC 8439), XChaCha20-Poly1305 (IETF), Salsa20-Poly1305 (`crypto_secretbox` aka XSalsa20+Poly1305), BLAKE2b
- **Manual algorithms (`utils/crypto.ts:14`):** `'AES-GCM' | 'AES-CTR' | 'ChaCha20-Poly1305' | 'XChaCha20-Poly1305' | 'Salsa20-Poly1305' | 'AES-GCM-Stream'`
- **IV lengths (`utils/cryptoPrimitives.ts:186-192`):** AES-GCM=12, AES-CTR=16, ChaCha20-Poly1305=12, XChaCha20-Poly1305=24, Salsa20-Poly1305=24
- **AES-CTR format:** `ciphertext || 32-byte HMAC-SHA256 tag` (Encrypt-then-MAC). HKDF-SHA256 splits the 32-byte secret into separate encryption + MAC subkeys. Constant-time MAC compare (`diff |= tag[i] ^ expectedTag[i]; if (diff !== 0) throw`).
- **Streaming chunk size:** `4 * 1024 * 1024` (4 MB), magic header `'CRYTO_STREAM'`, version `1` (`utils/streamCrypto.ts:17`)
- **Argon2id params (`utils/platform.ts`):** default = `19 iterations, 131072 KB memory, 4 parallelism, 32-byte hash`; mobile Tauri = `3 iterations, 65536 KB`; PIN purpose = `2 iterations, 32768 KB`; recovery = `10 iterations, 131072 KB` (non-mobile).
- **Backup passphrase:** 26 chars from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O/1/I`); 130 bits entropy; unbiased sampling via `floor(256/alphabetLength) * alphabetLength`.
- **Backup file format:** `[16-byte salt][12-byte IV][ciphertext + 16-byte GCM tag]`

### Storage
- **IndexedDB:** `DB_NAME = 'CrytoToolVault'`, `DB_VERSION = 3`, single object store `'files'` with `keyPath: 'id'`. Methods: `init, addItem, updateItem, getAllItems, deleteItem, clearDatabase, exportDatabase, importDatabase`. v3 migration encrypts legacy metadata via cursor.
- **localStorage keys (full list):**
  - `crytotool_salt`
  - `crytotool_vault_wrappers` (master + recovery key wrappers)
  - `crytotool_crypto_metadata` (master_salt + recovery_salts)
  - `crytotool_blur_time` / `crytotool_lock_time` / `crytotool_prog_lock_time` / `crytotool_prog_attempts`
  - `crytotool_vault_enabled` / `crytotool_vault_pin_hash` / `crytotool_vault_cats` / `crytotool_vault_keys`
  - `crytotool_ad_enabled` / `crytotool_ad_attempts` / `crytotool_ad_inactivity` / `crytotool_ad_countdown` (auto-destruct)
  - `crytotool_destruct_time` / `crytotool_last_activity`
  - `app_language` / `app_region`
  - `app_theme_config` / `app_accent_manual` / `theme_accent` / `app_font_config`
- **Web Crypto randomness:** `window.crypto.getRandomValues` for all IVs/salts.
- **No Tauri IPC:** `withGlobalTauri: false`. The Rust side is intentionally minimal — all crypto runs in the JS layer.

### i18n
- **Total locales:** 51 locale `.ts` files (one per language). Codes: `ar, bg, bn, bs, ca, cs, da, de, el, en, es, et, eu, fa, fi, fr, gl, he, hi, hr, hu, id, is, it, ja, jv, ko, lt, lv, mk, ml, ms, nl, no, pa, pl, pt, ro, ru, sk, sl, sq, sr, sv, ta, th, tr, uk, ur, vi, zh`.
- **Priority languages (`PRIORITY_LANGUAGES` in `locales/index.ts:102`):** `en, ro, es`. Only `en` is at 100%; `ro` is ~89.5%, `es` is ~93.6%. Others fall back to English for missing keys.
- **`TranslationKey` union (`locales/types.ts:13`):** a single long `|`-separated union of ~520 keys.
- **`Translations` interface:** `[key: string]: string` index signature. **Missing keys are silently allowed at runtime** — `t(key)` falls back: `currentTranslations[key] || fallback[key] || key`. So a missing translation shows the key string.
- **`t()` signature (`locales/i18nContext.tsx:57-59`):** `(key: TranslationKey) => string` — **no params**. For interpolation, call `t('exportHeader').replace('{{date}}', date)` manually. Placeholder convention: `{{name}}`.
- **Loader (`locales/index.ts:59-89`):** `import.meta.glob` lazy-loads all locale modules. `en` is statically bundled; others are dynamic and cached in a `Map<string, Translations>`.
- **Storage key for language:** `app_language` in localStorage.
- **For dynamic keys** (e.g. iterating category strings), cast: `t(cat as any)`.

### Build / CI
- **Build:** `npm run build` → `tsc && vite build`
- **Dev:** `npm run dev` → `vite` (port 5173)
- **Tauri:** `npm run tauri` → delegates to `@tauri-apps/cli`
- **Type check:** `npx tsc --noEmit` (the only static check; used in all CI workflows)
- **GitHub Actions (5 workflows):**
  - `release.yml` — creates GH release from `docs/CHANGELOG.md` on tag push `v*`
  - `tauri-linux.yml` — quick-sharun + appimagetool (133 lines)
  - `tauri-macos.yml` — matrix aarch64 + x86_64 (56 lines)
  - `tauri-windows.yml` — patches version for MSI (48 lines)
  - `tauri-android.yml` — universal APK + signing (121 lines)

## Project Structure

```
CrytoTool/
├── AGENTS.md                     # This file (agent instructions)
├── App.tsx                       # Root component: 516 lines, auth flow, recovery, lockout
├── index.html                    # 113 lines; inline pre-React theme script; CSP header
├── index.tsx                     # 18 lines; mounts <App /> via React 18 createRoot
├── index.css                     # 264 lines; @tailwind directives + safe-area CSS
├── metadata.json                 # 5 lines; landing page metadata
├── package.json                  # 66 lines
├── package-lock.json
├── postcss.config.js             # tailwindcss + autoprefixer
├── tailwind.config.js            # 44 lines; CSS-var-based color system
├── tsconfig.json                 # 32 lines; strict; target ES2020; bundler resolution
├── types.ts                      # 55 lines; FileSystemItem, ViewState, ThemeConfig, CryptoAlgorithm
├── vite.config.ts                # 20 lines; HTTPS if key.pem+cert.pem; port 5173
├── vite-env.d.ts
├── LICENSE                       # 34 KB; AGPL-3.0
│
├── assets/                       # 5 PNG images for README
│
├── components/                   # 18 .tsx files
│   ├── AuthScreen.tsx            # 442 lines; unlock/setup/recovery flow
│   ├── CopyMoveModal.tsx
│   ├── CustomColorPicker.tsx     # HSL accent picker
│   ├── CustomizeModal.tsx        # 623 lines; theme/font customization
│   ├── CustomSelect.tsx
│   ├── Dashboard.tsx             # 1168 lines; main shell, modals, view router
│   ├── DecryptModal.tsx          # 315 lines; manual decryption UI
│   ├── EncryptionModal.tsx       # 536 lines; 6 algorithms, hardware tiers
│   ├── FileActionMenu.tsx
│   ├── FileItem.tsx              # 244 lines; file/folder card
│   ├── FullPlayer.tsx            # full-screen music player
│   ├── LandingPage.tsx           # 233 lines; marketing page
│   ├── PinModal.tsx              # 201 lines; 6-digit PIN vault
│   ├── RecoveryCodesModal.tsx    # 69 lines; shows 10 codes + download
│   ├── SplashScreen.tsx          # 147 lines; animated SVG lock + checkmark
│   ├── TopActions.tsx
│   ├── ui.tsx                    # shared Button/Modal primitives
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
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md
│   ├── CODE_OF_CONDUCT.md
│   ├── CONTRIBUTING.md
│   ├── DESIGN.md
│   ├── DEVELOPMENT.md
│   ├── RELEASE.md
│   └── SECURITY.md
│
├── locales/                      # 53 .ts files (51 locales + types + index + context)
│   ├── index.ts                  # 136 lines; LANGUAGES, lazy loader, COMPLETION_PERCENTAGES
│   ├── types.ts                  # 15 lines; TranslationKey union, Translations interface
│   ├── i18nContext.tsx           # 81 lines; I18nProvider + useI18n()
│   ├── en.ts / ro.ts / es.ts     # 630 / 633 / 633 lines; priority languages
│   └── [48 other locale files]
│
├── src-tauri/                    # Tauri Rust desktop/mobile backend
│   ├── Cargo.toml                # 23 lines
│   ├── Cargo.lock
│   ├── tauri.conf.json           # 39 lines; productName, identifier, window config
│   ├── build.rs                  # 3 lines; tauri_build::build()
│   ├── crytotool.desktop         # 13 lines; Linux desktop entry
│   ├── src/
│   │   ├── main.rs               # 6 lines; calls app_lib::run()
│   │   └── lib.rs                # 30 lines; Linux WebKitGTK workarounds + greet command
│   ├── icons/                    # 25+ icons including android/ + ios/
│   ├── icon-sources/
│   ├── gen/                      # Tauri-generated (excluded)
│   └── target/                   # Rust build output (excluded)
│
├── styles/                       # 4 files
│   ├── glass.css                 # 618 lines; glassmorphism design system
│   ├── themes.ts                 # 78 lines; 100 theme generator across 10 categories
│   ├── fonts.ts                  # 137 lines; font config
│   └── fonts-imports.ts
│
├── utils/                        # 11 .ts files
│   ├── crypto.ts                 # 269 lines; OFF-LIMITS
│   ├── cryptoPrimitives.ts       # 192 lines; OFF-LIMITS
│   ├── streamCrypto.ts           # 221 lines; OFF-LIMITS
│   ├── backupCrypto.ts           # 147 lines; OFF-LIMITS
│   ├── metadataCrypto.ts         # 71 lines; OFF-LIMITS
│   ├── keyWrapping.ts            # 112 lines; OFF-LIMITS
│   ├── db.ts                     # 278 lines; IndexedDB wrapper
│   ├── vaultStorage.ts           # 130 lines; encrypted key entries
│   ├── security.ts               # 89 lines; PIN validation, hashPin/verifyPin
│   ├── platform.ts               # 26 lines; Argon2id params by purpose/device
│   └── sanitize.ts               # 56 lines; URL sanitization, HTML escape
│
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md  # 45 lines; Protocol-3305 table
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md         # 38 lines
│   │   ├── feature_request.md    # 42 lines; includes Protocol-3305 checkboxes
│   │   └── config.yml            # 5 lines; blank_issues_enabled: false
│   └── workflows/                # 5 CI files (see Build / CI)
│
├── dist/                         # Vite build output (gitignored)
└── node_modules/                 # standard (gitignored)
```

## Architecture

### Root state machine — Splash → Auth → Dashboard

`App.tsx` (516 lines) owns the top-level state machine and wraps everything in `<I18nProvider>`. Transitions use `AnimatePresence` for smooth fade/slide.

### `App.tsx` role
- **State stored in `useState` (with localStorage hydration):** `isSetupRequired`, `autoBlurSeconds` (default 20), `autoLockSeconds` (default 25), `isBlurred`, `settingsPassword`, `vaultEnabled`, `vaultPin` (PIN hash), `progressiveLockSeconds` (default 60), `failedAttemptsThreshold` (default 3), `autoDestructEnabled`, `autoDestructAttempts` (default 5), `autoDestructInactivity` (default 0), `destructCountdownSeconds` (default 30), `destructCountdown`, `destructTriggerTime`, `newlyGeneratedCodes`, `failedAttempts`, `lockUntil`.
- **Master key:** `masterKeyRef: useRef<CryptoKey>` holds the in-memory master key (never persisted).
- **Two inactivity timers:** one for authenticated state (blurs → locks → wipes), one for auth screen (wipes if inactivity exceeded).
- **Self-destruct countdown:** when `destructTriggerTime` is set, a timer ticks down `destructCountdown`.
- **`performWipe()`:** clears IndexedDB, localStorage, sessionStorage, then reloads the page.
- **Recovery code regeneration:** 10 new codes via `keyWrapping.generateRecoveryCodes()`.
- **`resetMasterPasswordWithRecovery(code, newPassword)`:** validates code, derives new master key, rewraps MVK.
- **Modal-level blur overlay** rendered here at `z-[100]`, not inside Dashboard.

### Auth flow — `components/AuthScreen.tsx` (442 lines)
- **Props:** `onUnlock, isSetup, lockUntil, onFailedAttempt, recoverySettings, onResetWithRecovery, destructCountdown, onNewCodes, onStoreMasterKey`.
- **Two modes:** `setup` (initial master password + confirm) and `unlock` (re-enter).
- **Recovery flow:** enter code + new password → calls back to `App`'s `resetMasterPasswordWithRecovery`.
- **Hardcoded colors:** `accentColor` from `theme_accent` localStorage (default `#39ff14`); `bgMain` from `app_theme_config`.
- **Key derivation:** `cryptoService.deriveMasterKey(password, salt)`, then `wrapRawKey(mvk, masterKey)`. The MVK wrapper is stored in `localStorage` as `crytotool_vault_wrappers`.

### View router — `Dashboard.tsx` (1168 lines, heaviest component)
- **`ViewState` type (`types.ts:27`):** `'dashboard' | 'search' | 'trash' | 'settings' | 'storage' | 'themes' | 'fonts' | 'about' | 'vault'`
- **Switching:** `useState<ViewState>('dashboard')` + bottom nav `NavButton` components.
- **Owns:** all modal open/close state, file-system CRUD logic, IndexedDB-to-FileSystemItem conversion, play-queue state, `formatBytes`, `formatTime`, `NavButton`.
- **Receives** all settings state from `App.tsx` (settingsLock, recoverySettings, vaultSettings, autoBlur, autoLock, progressiveLock, autoDestruct, destructCountdown) and forwards them down.

### Modal pattern
- **State in parent, modals presentational.** Modals return `null` when closed.
- **Translated data structures** (e.g. `EncryptionModal`'s `buildAlgorithms(t)`, `buildAlgoInfo(t)`, `buildHardwareTiers(t)`, `CustomizeModal`'s `getPackDefs`) are built with `useMemo` over `t()` from `useI18n()` rather than module-level constants — they re-render on language change.
- **Standard modal structure (`docs/DESIGN.md`):** `fixed inset-0 z-[150]`, backdrop `bg-black/80 backdrop-blur-sm`, `glass-card rounded-2xl`, header (with `bg-zinc-900/50`), scrollable content (`custom-scrollbar`), footer actions.
- **z-index hierarchy:** blur overlay `z-[100]`, modals `z-[150]`, recovery modal `z-[200]`, splash `z-[9999]`.

### i18n pattern
- `locales/i18nContext.tsx` provides `I18nProvider` and `useI18n()` hook.
- `useI18n()` returns `{ language, setLanguage, t, languages, languageOptions, loading }`.
- `t(key)`: `(key) => currentTranslations[key] || fallback[key] || key`.
- `setLanguage` writes to `localStorage` `app_language`.
- Lazy-loaded via `loadTranslations(code)` (in `locales/index.ts`); `en` bundled statically.
- `document.documentElement.lang = language` updated on switch.
- `languageOptions` is built from `LANGUAGES` + `COMPLETION_PERCENTAGES` (per-locale % used by `CustomizeModal` to show lock icons for incomplete translations).

### Storage pattern
- **IndexedDB** (`utils/db.ts`): single DB `CrytoToolVault` v3, store `files` with `keyPath: 'id'`. On `addItem`/`updateItem`, sensitive metadata fields are auto-encrypted via `metadataCrypto.encrypt` (returns `EncryptedMeta { ciphertext, iv }`), then plaintext fields are stripped via `metadataCrypto.stripFromItem`. If `fileData` exists and is not encrypted, it's encrypted via `cryptoService.encrypt` (default AES-GCM with vault key) before storage.
- **localStorage:** small config blobs. Vault keys in `crytotool_vault_keys` are stored encrypted as `{iv, data}` JSON.
- **No Tauri IPC** anywhere in the JS layer.

### Rust commands
- `src-tauri/src/lib.rs`:
  - `#[tauri::command] fn greet(name: &str) -> String` — **the only command**; returns `"Hello, {name}! You've been greeted from Rust!"`. Not used by the app.
  - `pub fn run()` is the mobile entry point (`#[cfg_attr(mobile, tauri::mobile_entry_point)]`).
  - Linux-only block (lines 16-24) sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` and `WEBKIT_DISABLE_COMPOSITING_MODE=1` before `tauri::Builder::default()`.

## Features by Section

### Settings — `components/views/SettingsView.tsx` (1150 lines)
- **Theme:** dark/light/system mode, 100 themes across 10 categories (Neon, Dark, Light, Nature, Ocean, Space, Retro, Royal, Sunset, Tech).
- **Fonts:** 40+ fonts across 6 categories (Modern, Tech, Serif, Display, Handwriting, System).
- **Custom accent color:** HSL picker via `CustomColorPicker`.
- **Language + region selectors.**
- **Security panel:**
  - **Master Password** (30+ characters enforced).
  - **Settings Password** (optional, separate).
  - **Auto-Blur** (default 20s).
  - **Auto-Lock** (default 25s).
  - **Progressive Lockout** (default: 3 attempts → 60s lock).
  - **Self-Destruct / Auto-Destruct** (configurable attempts, inactivity, countdown).
  - **Vault (PIN):** enable/disable, 6-digit PIN setup with blacklist.
  - **Recovery codes:** count display, regenerate button.
- **About section:** mission, technologies, developer links, open source message.
- Also exports: `ThemesGalleryView`, `AboutView`, `FontsGalleryView`.

### Vault — `components/views/VaultView.tsx` (353 lines)
- Encryption key storage with categories.
- **Default categories:** `Personal`, `Financiar`, `Social Media`, `Documente`.
- **Custom categories** created at runtime, stored in `crytotool_vault_cats`.
- Categories have icon (folder, card, key, web, note, hash) and color.
- Each key entry has: `id, key, algorithm, fileName, categoryId, date, fileId`.
- Persisted via `utils/vaultStorage.ts` to `localStorage` key `crytotool_vault_keys`, encrypted with the vault key.
- Operations: view, copy, show/hide (eye toggle), delete (with confirm), create custom category.
- **Auto-fill from Vault:** when manually decrypting, can pull key from Vault.

### Music — `components/views/MusicView.tsx` (180 lines)
- 4 sub-tabs: songs, albums, artists, playlists.
- Quick Picks horizontal scroller.
- Equalizer animation when playing.
- Cover-art support with safe-URL sanitization.
- Click-to-play invokes parent's `onPlay(item)` which sets `currentSong`.
- Empty state: "Coming Soon" with description.
- `FullPlayer.tsx` (4.9 KB) is the expanded player view.

### Gallery — `components/views/GalleryView.tsx` (207 lines)
- 5 sub-tabs: all, photos, videos, favorites, albums.
- **Lightbox:** full-screen image/video viewer with Info and Trash buttons.
- **Auto-decrypts** items that are AES-GCM (default vault encryption) — no salt means vault key works.
- **Manual-encrypted items** (with `salt`) need key from Vault.
- Sanitizes URLs via `sanitizeUrl()` before displaying.
- Decrypting indicator (lock icon while in-flight).

### Search — `components/views/SearchView.tsx` (87 lines)
- Single text input, auto-focus.
- Filters all non-system items by name (uses `decryptedName` if present, else `name`).
- Case-insensitive `.toLowerCase().includes()`.
- Empty state: "Start typing to search."
- No-results state: "Niciun rezultat pentru {query}".
- Renders results as minimal `FileItem` rows.

### Storage — `components/views/StorageView.tsx` (95 lines)
- Circular SVG progress chart of `used / limit`.
- Breakdown bars for: pictures (image), video, music (audio), documents.
- Color-coded: accent, purple, yellow, blue.
- Animated width transitions.

### Trash — `components/views/TrashView.tsx` (87 lines)
- List of trashed items.
- Warning banner: "Files in trash are automatically deleted after 30 days".
- Hover actions: Restore (green) + Delete Forever (red).
- Empty state: large trash icon.

### Backup — `components/views/BackupView.tsx` (425 lines)
- **6-step state machine:** `'menu' | 'create_gen' | 'create_done' | 'restore_input' | 'restore_process' | 'restore_done'`.
- **Create flow:** generate 26-char key → assemble `{ localStorage: {...allowed keys}, db: [...], timestamp, version }` JSON → encrypt with `backupCryptoService.encryptBackup` → download as `crytotool-backup-YYYY-MM-DD.enc`.
- **Restore flow:** pick `.enc` file + enter 26-char key → decrypt → validate `data.db` and `data.localStorage` exist → only restore whitelisted `localStorage` keys (allowlist of ~18 keys including `crytotool_salt`, `crytotool_vault_wrappers`, `crytotool_crypto_metadata`, `crytotool_vault_pin_hash`, `crytotool_ad_*`, `crytotool_blur_time`, `crytotool_lock_time`, `crytotool_prog_*`, `app_theme_config`, `app_font_config`, `app_language`, `app_region`, `theme_accent`) → `db.importDatabase` → success screen.
- Copy-to-clipboard for the generated key.

## Limitations — You MUST NOT Touch Crypto Without Approval

**CRITICAL:** The project architect (`wtshex1`) and approved security auditors are the **only** people allowed to modify crypto code. Contributors MUST NOT modify any of the six files below. The PR template makes "PR does NOT modify cryptographic code, key derivation, or encryption algorithms" a blocking checklist item.

| File | Lines | Purpose |
| --- | --- | --- |
| `utils/crypto.ts` | 269 | High-level encryption service: `cryptoService` (singleton), `EncryptionService` class with private `vaultKey`, `deriveMasterKey` (Argon2id → AES-256-GCM `CryptoKey`), `setVaultKey`/`clearKeys`, `generateVaultKey`, `encryptWithPassphrase`/`decryptWithPassphrase` (all 6 algorithms), `encrypt`/`decrypt` (default vault AES-GCM with 12-byte IV), `encryptString`/`decryptString` (string-level AES-GCM used by `metadataCrypto` and `vaultStorage`). |
| `utils/cryptoPrimitives.ts` | 192 | Isolated algorithm primitives (for security audit). `aesGcm` (NIST SP 800-38D, 12-byte IV), `aesCtr` (AES-CTR + HMAC-SHA256 Encrypt-then-MAC, HKDF-SHA256 subkey split, constant-time MAC compare), `chacha20Poly1305` (libsodium IETF, 12-byte IV), `xChacha20Poly1305` (24-byte nonce), `salsa20Poly1305` (XSalsa20+Poly1305, 24-byte nonce), `IV_LENGTHS` const map, `ensureSodiumReady()`. |
| `utils/streamCrypto.ts` | 221 | 4MB chunked streaming encryption. `CHUNK_SIZE = 4 * 1024 * 1024`, magic header `'CRYTO_STREAM'`, version `1`. `deriveChunkIV(baseIV, chunkIndex)` uses HMAC-SHA256 keyed with baseIV → per-chunk 12-byte IV. `streamCrypto.encrypt`/`decrypt` split data into chunks; format: `[header][chunk_0]...[chunk_N]`. |
| `utils/backupCrypto.ts` | 147 | Backup encrypt/decrypt with 26-char passphrase (130-bit entropy, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, unbiased sampling). Argon2id → AES-GCM. File format: `[salt(16)][iv(12)][ciphertext+16-byte GCM tag]`. Minimum length check `salt+iv+16 = 44 bytes`. |
| `utils/metadataCrypto.ts` | 71 | Encrypted metadata blobs. `MetadataPlaintext` (`name, tags, artist, album, coverUrl, customIcon, externalUrl`) → `EncryptedMeta { ciphertext, iv }` (both base64). `metadataCrypto.encrypt`/`decrypt`/`hasEncryptedMeta`/`extractPlaintext`/`getDisplayName`/`stripFromItem`. |
| `utils/keyWrapping.ts` | 112 | Master key wrap/unwrap + 10 recovery codes. `deriveKey(secret, salt, purpose?)` (Argon2id → AES-GCM), `wrapRawKey`/`unwrapRawKey` (12-byte IV AES-GCM). `generateRecoveryCodes()` produces 10 codes in format `CRYTO-NN-XXXX-XXXX-XXXX` (NN = `01`-`10`, body = 12 chars with dashes every 4). Recovery alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars). |

**Also forbidden (and equally critical):**
- Changing **Argon2id parameters** (iterations, memory, parallelism, hash length) in `utils/platform.ts`.
- Changing the **chunk size** in `utils/streamCrypto.ts` (`4 * 1024 * 1024`).
- Changing **IV lengths** in `utils/cryptoPrimitives.ts`.
- Changing the **recovery code alphabet** or code format in `utils/keyWrapping.ts`.
- Changing the **backup passphrase alphabet** or entropy budget in `utils/backupCrypto.ts`.
- Changing the **backup file binary format** (offsets/ordering of salt/IV/ciphertext/tag).

If a fix is needed in crypto code, **describe the change in an issue and ask the architect** — never commit it directly.

## Respecting Project Design

### People-first language (mandatory)
- **Source of truth:** `docs/CONTRIBUTING.md` lines 29-32, `docs/DESIGN.md` lines 9-25, `docs/CODE_OF_CONDUCT.md` line 11.
- Use **"persoane"** (RO) / **"people"** (EN) / localized equivalent.
- **Never** use **"utilizatori"** (RO) / **"users"** (EN) in UI text.
- Rationale: "People are humans first, customers second. This language reinforces respect."

### Terminology table
| Wrong | Correct | Context |
| --- | --- | --- |
| `users` / `utilizatori` / `usuarios` | `people` / `persoane` / `oameni` / `personas` | UI text and code, in all locales |
| `login` / `logout` | `unlock` / `lock` | Vault access is about unlocking, not logging in |
| `password` | `master password` | Always specify "master" for vault |
| `files` (in some views) | `items` | Generic term in Music / Gallery / Search |
| `password reset` | (avoid; use recovery code flow) | Vault has no reset — only recovery codes |

### Code style
- **TypeScript strict mode** enabled (`tsconfig.json` line 14).
- **English comments only** (`docs/CONTRIBUTING.md` line 37).
- **React functional components with hooks**; no class components (`docs/CONTRIBUTING.md` line 38).
- **Conventional commits:** `type(scope): description` with types `feat, fix, docs, style, refactor, test, chore` (`docs/CONTRIBUTING.md` lines 51-60).
- **Version sync:** `package.json` and `src-tauri/tauri.conf.json` must match (`2.5.0-beta`). `src-tauri/Cargo.toml` may use `2.5.0` (no `-beta` allowed in MSI).
- **No comments unless asked.**

### i18n rules
- Use `t('key')` in components; never hardcode strings (except error codes).
- New keys must be added to the `TranslationKey` union in `locales/types.ts` AND to `en.ts`, `ro.ts`, `es.ts`.
- Placeholder convention: `{{name}}` (e.g. `t('exportHeader').replace('{{date}}', date)`).
- For dynamic keys, cast: `t(cat as any)`.

### No telemetry
- **Nothing leaves the device.** No server, no network calls anywhere in the app.
- License: AGPL-3.0 (the source is auditable but the *code* never phones home).

### Theme system
- 100 themes across 10 categories (Neon, Dark, Light, Nature, Ocean, Space, Retro, Royal, Sunset, Tech), generated programmatically in `styles/themes.ts`.
- 40+ fonts across 6 categories (Modern, Tech, Serif, Display, Handwriting, System).
- Glassmorphism: `bg-zinc-900/80` with `backdrop-blur-xl`; `glass-card`, `glass-surface`, `glass-button` classes in `styles/glass.css`.
- Accent default: Neon Green `#39ff14` (customizable via `CustomColorPicker`; stored in `localStorage` as `crytotool_accent_h/s/l`, applied via CSS vars in `index.css`/`index.html`).
- Dark / Light / System modes.

### Animation
- **Framer Motion** `AnimatePresence` for transitions.
- Page enter/exit: `{ opacity: 0, x: 50 }` → `{ opacity: 1, x: 0 }`.
- Modal: `{ opacity: 0, scale: 0.9, y: 20 }` → `{ opacity: 1, scale: 1, y: 0 }`.
- Loading: `Loader2` from `lucide-react` with `animate-spin`.

### Accessibility
- 4.5:1 minimum color contrast.
- Keyboard navigation, focus-visible, Escape closes modals, Enter triggers action.
- `aria-label` for icon-only buttons.
- `aria-live="polite"` for dynamic messages.
- `role="dialog"` for modals.

### Mobile-first responsive
- 375px (small phones) and 1920px (large desktops) breakpoints.
- 20px icons.
- Minimum touch targets: `p-3` (12px padding all around content).

## Respecting Templates

### PR template — `.github/PULL_REQUEST_TEMPLATE.md`
**Mandatory sections** (in this order, no structural modifications):
1. **Summary** — with `Issue:`, `Type:` (Bug fix / New feature / Security fix / Refactor / Docs / CI / Breaking change), `Platform:` (Desktop / Mobile / Web / All).
2. **Changes** — bulleted list.
3. **Protocol-3305 alignment** — links to `https://github.com/ObscuritySecurity/protocol-3305`, contains the **EXACT 9-article table** (see below).
4. **Checklist** (blocking):
   - [ ] **PR does NOT modify cryptographic code, key derivation, or encryption algorithms**
   - [ ] Tested on target platform(s)
   - [ ] `npx tsc --noEmit` passed
   - [ ] Docs updated

**Protocol-3305 table rules:**
- **Status:** `✓` if compliant, `X` if violation (blocking).
- **Notes:** short technical explanation, max 1 sentence.
- **Do NOT** add new rows, new principles, new columns, or change article order.
- Correct example: `✓ | "No monetization change"`, `✓ | "AppImage runtime does not collect data"`, `X | "Adds telemetry - requires protocol exception"`.

### Bug report template — `.github/ISSUE_TEMPLATE/bug_report.md`
- **Title prefix:** `[Bug]` — label `bug`.
- **Sections:** Describe the bug / To Reproduce / Expected behavior / Screenshots / Environment (Platform, OS, Version, Browser, Installation method) / Additional context.
- **Special checkbox:** `[ ] Yes — this affects encryption/security` (security concern flag — **always set this if the bug touches crypto/auth/permissions**).

### Feature request template — `.github/ISSUE_TEMPLATE/feature_request.md`
- **Title prefix:** `[Feature]` — label `enhancement`.
- **Sections:** Is your feature request related to a problem? / Describe the solution / Describe alternatives / Additional context / I18n impact.
- **Protocol-3305 compliance checkboxes** for all 9 articles.
- **Platform targeting checkboxes:** Desktop (Tauri — Windows / Linux / macOS) / Mobile (Tauri v2 — Android / iOS). ⚠️ The template currently says "Capacitor" — a known inconsistency to ignore; the project is **Tauri v2**, not Capacitor.

### `.github/ISSUE_TEMPLATE/config.yml`
- `blank_issues_enabled: false` (must use a template).
- Contact link: Security vulnerability report → `https://github.com/ObscuritySecurity/CrytoTool/security/advisories/new`.

### Protocol-3305 — the 9 articles (exact names, in order)

| Art. | Principle (EXACT NAME) |
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

**Subtitles (as they appear in the feature-request template):**
- **Art. 0 — Ethical Monetization:** No monetization of personal data; security is never a premium feature.
- **Art. 1 — Privacy by Design:** Privacy integrated into the architecture from the start.
- **Art. 2 — Security by Default:** Highest security settings enabled out of the box.
- **Art. 3 — Zero Trust:** "Never trust, always verify" — no implicit trust for any actor.
- **Art. 4 — Zero Knowledge:** End-to-end encrypted; decryption keys accessible only to the person.
- **Art. 5 — Zero Personal Data Collection:** No PII collected or stored beyond what's strictly necessary.
- **Art. 6 — Zero Activity Logs:** No tracking of activity, IP addresses, session times, or metadata.
- **Art. 7 — Open Source:** Code must remain publicly auditable.
- **Art. 8 — Zero Non-Essential Permissions:** Least privilege — only request permissions essential to core functionality.

PRs must complete the 9-row table with ✓ (compliant) or X (violation, blocking) plus a short technical note (max 1 sentence). The table has EXACTLY 4 columns: `Art.`, `Principle`, `Status`, `Notes`. No new rows, no new principles, no new columns, no reordering.

### Build & verify (at-a-glance)

```bash
npm run dev      # Vite dev server at http://localhost:5173 (HTTPS if key.pem+cert.pem present)
npm run build    # tsc --noEmit + vite build (the only CI gate; no separate lint/test)
npx tsc --noEmit # The only static check; required by PR template
```

---

## ⚠️ APPROVAL REQUIREMENT FOR ALL GIT & GITHUB ACTIONS

**Effective immediately, an agent MUST NOT perform any of the following actions without the EXPLICIT, EXPLICITLY-WRITTEN approval of `wtshex1` (the repository owner).** This applies in every session, for every change, no matter how small.

### ❌ FORBIDDEN without explicit `wtshex1` approval

- `git commit` (including `--amend`, including automated fixup commits)
- `git push` (including `--force`, including to any remote/branch)
- Opening a **new** Pull Request (`gh pr create`)
- Closing, reopening, editing, or commenting on an existing Pull Request
- Creating, moving, or deleting a **tag** (`git tag`, `git push --tags`, `git push origin :tag`)
- Merging, squashing, or rebasing a Pull Request
- Force-pushing to any branch
- Deleting any branch (local or remote)
- Publishing or updating a GitHub Release (`softprops/action-gh-release` or otherwise)
- Any `git commit --amend` after a failed CI run
- Any modification to PR body, title, labels, reviewers, or assignees

### ✅ WHAT IS ALWAYS ALLOWED (no approval needed)

- Reading files (`read`, `grep`, `glob`)
- Searching the codebase, git history, GitHub issues/PRs (`gh pr view`, `gh run view`, etc.)
- Editing files locally (in the working tree)
- Running build / test / lint commands locally
- Running `git status`, `git diff`, `git log`, `git branch --list` (read-only)
- Asking the owner clarifying questions and proposing a plan
- Suggesting the exact command(s) that the owner should run themselves

### 📝 APPROVAL FORMAT

- The owner writes the explicit approval in chat (e.g., `DA`, `OK`, `merge`, `go`, `commit`, `push`, or any clear affirmative).
- Implicit approval from context is **never** sufficient.
- If the owner is silent, asks a question, or says anything other than an explicit `DA`/`OK`/etc. — **DO NOTHING**.
- If unsure, ask. Never assume.

### 🎯 EXAMPLES

| Situation | Agent action | Correct? |
| --- | --- | --- |
| Owner says "push the PR" | Agent runs `git push` | ✅ (explicit) |
| Owner says "we should merge" | Agent runs `gh pr merge` | ❌ (declarative, not a direct command to the agent) |
| Owner is silent after agent proposes a plan | Agent commits and pushes | ❌ (no explicit approval) |
| Owner says "DA, commit" | Agent runs `git commit` | ✅ (explicit) |
| Owner says "you're annoying me" | Agent keeps trying | ❌ (no approval, stop and ask) |
