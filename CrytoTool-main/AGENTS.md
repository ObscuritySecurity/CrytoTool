# CrytoTool Vault - Agent Instructions

## Build Commands
```bash
npm run dev      # Start dev server
npm run build    # TypeScript check + Vite build
npm run tauri    # Build Tauri desktop app
npm run cap      # Build Capacitor mobile app
```

## Architecture
- **Type**: React + TypeScript + Vite + Tailwind CSS
- **Desktop**: Tauri (Rust backend)
- **Mobile**: Capacitor (React Native wrapper)
- **Encryption**: Argon2id + AES-256-GCM (client-side only)
- **Storage**: IndexedDB + localStorage (no server)
- **i18n**: 50+ languages, all UI text in i18nContext

## Key Conventions
- **Code comments**: English only (for international contributors)
- **People-first language**: Always use "people" / "persoane" / "oameni". Never "users" / "utilizatori" in any language.
- **Version**: 2.5.0-PRO
- **No telemetry**: Zero data collection, local-first

## Critical Files
- `App.tsx` - Main state, auth flow, recovery codes logic
- `components/AuthScreen.tsx` - Unlock/setup screen with recovery modal
- `components/Dashboard.tsx` - Main file manager view
- `components/views/SettingsView.tsx` - Settings including recovery codes modal
- `utils/crypto.ts` - Core cryptographic operations

## Common Patterns
- Recovery codes stored in `localStorage crytotool_recovery_codes` as JSON array
- Vault key derived from Master password + random salt
- PIN vault stored as hash in localStorage
- All crypto uses Web Crypto API

## TypeScript Check
```bash
npx tsc --noEmit
```
Build will fail if TypeScript errors exist.