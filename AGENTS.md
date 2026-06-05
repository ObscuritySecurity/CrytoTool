# CrytoTool Vault - Agent Instructions

## Build & Verify

```bash
npm run dev      # Vite dev server at http://localhost:5173 (HTTPS if key.pem+cert.pem present)
npm run build    # tsc --noEmit + vite build (the only CI gate; no separate lint/test)
npm run tauri    # Build Tauri desktop app (delegates to `tauri` CLI)
```

There are no `test`, `lint`, or `format` scripts. `npx tsc --noEmit` is the only static check; `npm run build` is the only verification before opening a PR. The PR template (`/.github/PULL_REQUEST_TEMPLATE.md`) requires `npx tsc --noEmit` to pass.

## Architecture

- **Stack**: React 18 + TypeScript (strict) + Vite 8 + Tailwind 3, wrapped by Tauri v2 for desktop (Linux/macOS/Windows) and mobile (Android/iOS).
- **Crypto**: Argon2id (`hash-wasm`) + AES-256-GCM / ChaCha20-Poly1305 / XChaCha20-Poly1305 / AES-CTR+HMAC / Salsa20. All client-side, no network calls anywhere in the app.
- **Storage**: IndexedDB for file blobs, `localStorage` for theme/recovery-codes/vault-PIN-hash/region. `withGlobalTauri: false` — Tauri IPC is not used from JS; the Rust surface is minimal.
- **i18n**: 50+ locale files in `locales/`; only `en`, `ro`, `es` are kept at 100% (`PRIORITY_LANGUAGES` in `locales/index.ts`). Others fall back to English.
- **Entry**: `index.tsx` mounts `<App />`; `index.html` has an inline pre-React script that applies saved theme to `localStorage` to prevent flash.

## Critical Constraints

- **Crypto files are off-limits**: never modify `utils/crypto.ts`, `utils/cryptoPrimitives.ts`, `utils/streamCrypto.ts`, `utils/backupCrypto.ts`, `utils/metadataCrypto.ts`, `utils/keyWrapping.ts`. PR template makes this a blocking checklist item.
- **People-first language**: UI text and code must use "people" / "persoane" / "oameni" / "personas". Never "users" / "utilizatori" / "usuarios". `CONTRIBUTING.md` is explicit about this.
- **Terminology**: "unlock" / "lock", never "login" / "logout". "Master password", never "master password reset" implies a different flow.
- **Comments**: English only.
- **No telemetry**: nothing leaves the device.

## i18n Workflow

- `locales/types.ts` defines a `TranslationKey` union (~520 keys) and a `Translations` type with index signature `[key: string]: string`. **The index signature means missing keys are allowed at runtime** — `t(key)` falls back: `currentTranslations[key] || fallback[key] || key`. So a missing translation silently shows the key string.
- Adding a new key: add to the `TranslationKey` union in `locales/types.ts` (one line, alphabetical-ish with neighbors) and to all three of `en.ts` / `ro.ts` / `es.ts`. Other locales don't need entries (fallback covers them).
- `t()` in `i18nContext.tsx` only takes a key, no params. For interpolation, call `t('exportHeader').replace('{{date}}', date)` manually — placeholder convention uses `{{name}}`.
- `loadTranslations` (`locales/index.ts`) uses `import.meta.glob` to lazy-load all locale modules. `en` is statically bundled; others are dynamic.
- For dynamic keys (e.g. iterating translation-key category strings), cast: `t(cat as any)`.

## Layout

- `App.tsx` — root state, auth flow, recovery codes, view router.
- `components/` — top-level modals and dashboard shell; `components/views/` — tab views (Settings, Vault, Music, Gallery, Search, Storage, Trash, Backup).
- `utils/` — crypto, db (IndexedDB), sanitize, security, platform, vaultStorage. **See crypto off-limits list above.**
- `locales/` — `index.ts` (loader + LANGUAGES list), `i18nContext.tsx` (provider), `types.ts` (TranslationKey union), one file per locale.
- `src-tauri/` — Tauri config + minimal Rust; productName "CrytoTool", identifier `com.crytotool.vault`, dev URL `http://localhost:5173`.

## Conventions

- React functional components with hooks; no class components.
- Heavy modals that need translated data structures (e.g. `EncryptionModal`'s `ALGORITHMS`/`ALGO_INFO`/`HARDWARE_TIERS`, `CustomizeModal`'s `getPackDefs`) are built with `useMemo` over `t()` from `useI18n()` rather than module-level constants, so they re-render on language change.
- Modal-level state for transient UI lives in the parent (`Dashboard.tsx`); modals themselves are presentational.
- Vite serves the app at port 5173; if `key.pem`/`cert.pem` exist in repo root, HTTPS is enabled automatically (used for testing secure-context features like Web Crypto subtle APIs).
- Version `2.5.0-beta`. Tauri build reads version from `package.json` and `src-tauri/tauri.conf.json` — keep both in sync.
- PRs go through `.github/PULL_REQUEST_TEMPLATE.md` which requires a Protocol-3305 compliance table (Art. 0-8: privacy, zero-knowledge, open source, etc.).

## Linux Build Strategy (truly portable AppImage)

The Linux release workflow (`.github/workflows/tauri-linux.yml`) produces a **single truly-portable AppImage** that runs on any Linux distribution (Arch, Ubuntu 14.04+, Fedora 43+, musl/Alpine, NixOS) — including old laptops (Intel Haswell) and modern PCs (AMD/NVIDIA/Wayland/X11).

**Mechanism**: instead of `linuxdeploy` (which has known EGL/DMABUF/Wayland issues — see tauri-apps/tauri#11994, #15050), the workflow:
1. Builds the Rust binary with `npx tauri build --no-bundle` on `ubuntu-24.04`.
2. Downloads `quick-sharun.sh` from `pkgforge-dev/Anylinux-AppImages`.
3. Runs `quick-sharun <binary>` which uses `strace` to detect every library (including `dlopen`-ed ones), bundles libc, ld-linux, libGL, libEGL, libwayland, libwebkit2gtk, GTK3 — and produces an AppImage whose `AppRun` uses `--library-path` (NOT `LD_LIBRARY_PATH`, so it does not leak to child processes).
4. Uploads as `CrytoTool_<tag>_amd64.AppImage` (universal, ~180-220 MB).

**Runtime safety net** (in `src-tauri/src/lib.rs::run()`, Linux only): sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` and `WEBKIT_DISABLE_COMPOSITING_MODE=1` before `tauri::Builder::default()`.

**Do NOT**:
- Replace `quick-sharun` with `linuxdeploy` (regresses the Wayland/Hyprland/EGL_BAD_PARAMETER fix).
- Switch runner back to `ubuntu-22.04` (older libwebkit2gtk-4.1 has known regressions).
- Bundle only system WebKit without quick-sharun (ABI mismatch with Mesa EGL on user systems).
- Drop the env var workarounds from `lib.rs` (they are belt-and-suspenders for edge cases).

## Common Gotchas

- Editing `locales/en.ts` / `ro.ts` / `es.ts`: the files are large (~600 lines) and key order matters for diff readability — insert near the alphabetical neighborhood of related keys, not at the bottom.
- `Translations` index signature means TS won't catch a missing translation key at compile time. Manually grep for the key in all three locales after adding to the union.
- `Tauri.conf.json` sets `decorations: false` and `transparent: true` on the main window — title bar is rendered in-app, not by the OS.
- `dist/` is the Vite build output; `key.pem`/`cert.pem` are gitignored local dev certs (present only when developer sets up HTTPS).
- No package-lock changes needed for adding a dep: `npm install <pkg>` is the workflow; lockfile updates via standard npm.
