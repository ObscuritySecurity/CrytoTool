# CrytoTool Development Guide
_Version: 2.5.0-beta | Last Updated: 2026-06-21_

---

## Prerequisites

### Required Software
- **Node.js** v18+ (LTS recommended)
- **npm** v9+
- **Rust** (latest stable) — required for WASM build + Tauri
- **wasm-pack** — `cargo install wasm-pack`
- **C/C++ compiler** — for native dependencies

### For Mobile Development
- **Android Studio** + Android SDK 35 (Android)
- **Xcode** (iOS, macOS only)

---

## Initial Setup

```bash
git clone https://github.com/ObscuritySecurity/CrytoTool.git
cd CrytoTool
npm install
```

Key dependencies:
- `crypto-core/` — Rust crate with all crypto (Argon2id, AES-GCM, ChaCha20-Poly1305, etc.) compiled to WASM
- `framer-motion` — Animations
- `lucide-react` — Icons
- `@fontsource/*` — 17 font packages

---

## Development Workflow

### Build Order

**Always build WASM first, then the frontend:**

```bash
npm run build:wasm   # wasm-pack build crypto-core --target web --out-dir pkg
npm run build        # tsc --noEmit + vite build
```

### Dev Server
```bash
npm run dev   # http://localhost:5173 (HTTPS if key.pem+cert.pem exist)
```

### Type Check
```bash
npx tsc --noEmit
```

### Available Scripts
```bash
npm run dev          # Vite dev server
npm run build:wasm   # Build crypto-core Rust crate to WASM
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build
npm run tauri        # Build Tauri desktop app
npm run tauri android build   # Build Android APK
```

### Code Style
- TypeScript strict mode — must pass `npx tsc --noEmit`
- React hooks, no class components
- Conventional commits: `type(scope): description`
- Types: `feat, fix, docs, style, refactor, test, chore`

---

## Project Structure

```
CrytoTool/
├── crypto-core/           # Rust WASM crate (ALL crypto)
│   ├── src/*.rs           # 14 modules + wasm bindings
│   ├── index.ts           # JS bridge to WASM
│   └── db.ts              # IndexedDB wrapper
├── components/            # React UI
│   ├── AuthScreen.tsx     # Setup/unlock/recovery
│   ├── Dashboard.tsx      # Main shell + view router
│   └── views/             # 8 page views
├── locales/               # 51 languages
├── styles/                # glass.css + themes + fonts
└── src-tauri/             # Tauri backend (Rust)
```

---

## Adding a New Feature

1. Create a branch: `git checkout -b feature/my-feature`
2. New views → `components/views/FeatureView.tsx`
3. New modals → `components/FeatureModal.tsx`
4. **Crypto changes are RESTRICTED** — only `wtshex1` + approved auditors may touch `crypto-core/src/*.rs`
5. Update i18n — add keys to `locales/en.ts`, `ro.ts`, `es.ts`
6. Build & type-check: `npm run build:wasm && npm run build`
7. Update docs: `ARCHITECTURE.md`, `API.md`, or `SECURITY.md`
8. Commit & PR

---

## Security Considerations

1. **Never log the vault key** — even in development
2. **Vault key is only in memory** — `masterKeyRef` in `App.tsx`
3. **Encrypt before localStorage** — all sensitive data goes through WASM encrypt
4. **Crypto code is off-limits** — `crypto-core/src/*.rs` may only be modified by the project architect
5. Report vulnerabilities via GitHub Security Advisories

---

## Vitest (Testing)

CrytoTool has `vitest` configured with `jsdom` for component testing:

```bash
npx vitest
```

Config: `vitest.config.ts` — React plugin + jsdom environment.

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build WASM | `npm run build:wasm` |
| Check types | `npx tsc --noEmit` |
| Build web | `npm run build` |
| Build desktop | `npm run tauri` |
| Build Android | `npm run tauri android build` |
| Run tests | `npx vitest` |
