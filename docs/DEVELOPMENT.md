# CrytoTool Development Guide
_Version: 2.5.0-beta | Last Updated: 2026-05-27_

This guide helps developers set up their environment and understand the development workflow for CrytoTool.

---

## Prerequisites

### Required Software
- **Node.js** v18+ (LTS recommended)
- **npm** v9+ (comes with Node.js)
- **Rust** (latest stable) - for Tauri desktop builds
- **C/C++ compiler** - for native dependencies:
  - Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `build-essential` (Ubuntu/Debian) or equivalent

### For Mobile Development (Optional)
- **Android Studio** + Android SDK (for Android)
- **Xcode** (for iOS, macOS only)
- **Tauri v2 mobile prerequisites**: `cargo install tauri-cli`

---

## Initial Setup

### 1. Clone the Repository
```bash
git clone https://github.com/ObscuritySecurity/CrytoTool.git
cd CrytoTool
```

### 2. Install Dependencies
```bash
npm install
```

This installs:
- `hash-wasm` - Argon2id implementation
- `libsodium-wrappers` - ChaCha20, XChaCha20, BLAKE2b
- `framer-motion` - Animations
- `lucide-react` - Icons
- `idb` - IndexedDB wrapper
- `vite`, `tailwindcss`, `typescript` - Build tooling

### 3. Run Development Server (Web)
```bash
npm run dev
```

Opens at `http://localhost:5173`

---

## Development Workflow

### Project Structure
```
CrytoTool/
├── utils/           # Core logic & crypto
│   ├── crypto.ts             # Master key derivation, AES-GCM
│   ├── cryptoPrimitives.ts   # Isolated algorithms
│   ├── streamCrypto.ts       # Chunked streaming
│   ├── backupCrypto.ts       # Backup encryption
│   ├── db.ts                 # IndexedDB wrapper
│   ├── vaultStorage.ts       # Encrypted key storage
│   └── security.ts           # PIN, lockout
│
├── locales/         # Internationalization (51 languages)
│   ├── index.ts              # Language loader
│   └── i18nContext.tsx       # React i18n context
│
├── components/      # React UI
│   ├── App.tsx               # Main app state
│   ├── Dashboard.tsx         # File manager
│   ├── AuthScreen.tsx        # Unlock/setup
│   └── views/                # Full-page views
│       ├── StorageView.tsx
│       ├── GalleryView.tsx
│       ├── MusicView.tsx
│       ├── VaultView.tsx
│       ├── BackupView.tsx
│       └── SettingsView.tsx
│
├── styles/          # Styles and themes
│   ├── themes.ts             # 100 theme configurations
│   ├── fonts.ts              # 40+ font configurations
│   ├── fonts-imports.ts      # Font face imports
│   └── glass.css             # Glassmorphism system
│
└── src-tauri/      # Tauri desktop (Rust)
```

### Available Scripts
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build
npm run tauri dev    # Start Tauri desktop dev server
npm run tauri build  # Build Tauri app (desktop + mobile)
```

### Code Style
- **TypeScript strict mode** - All code must pass `tsc --noEmit`
- **English comments only** - For international contributors
- **No console.log in production** - Use proper error handling
- **People-first terminology** - "people"/"persoane", never "users"/"utilizatori"

### Adding a New Feature

1. **Create a branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Follow patterns**
   - New views → `components/views/FeatureView.tsx`
   - New modals → `components/FeatureModal.tsx`
   - New crypto → add to `utils/crypto.ts` or `utils/cryptoPrimitives.ts`

3. **Update i18n** - Add English source strings in `locales/` (other languages are translated by the community)

4. **Test build**
   ```bash
   npm run build  # Must pass with no errors
   ```

5. **Update documentation** - `ARCHITECTURE.md`, `SECURITY.md`, or `API.md`

6. **Commit**
   ```bash
   git commit -m "feat(scope): description"
   ```

---

## Building for Different Platforms

### Web (Default)
```bash
npm run build
# Output: dist/ folder
```

### Desktop (Tauri)
```bash
npm run tauri build
# Output: src-tauri/target/release/
```

**Requirements:**
- Rust installed (https://rustup.rs/)
- System dependencies for Tauri (see https://v2.tauri.app/start/prerequisites/)

**First run:**
```bash
npm run tauri dev    # Development with hot reload
```

### Mobile (Tauri v2)

Tauri v2 includes native mobile build support:

```bash
npm run tauri android build   # Build for Android
npm run tauri ios build       # Build for iOS (macOS only)
```

---

## Debugging

### Browser DevTools
- **Console** - Check for errors
- **Application tab** - Inspect IndexedDB, localStorage
- **Network tab** - No network requests (100% client-side)

### Crypto Debugging
```typescript
// Check Vault Key state
console.log('Vault Key exists:', !!cryptoService.vaultKey);

// Inspect localStorage
console.log(localStorage.getItem('crytotool_salt'));
console.log(localStorage.getItem('crytotool_vault_pin_hash'));
```

### Common Issues

**TypeScript errors:**
```bash
npx tsc --noEmit  # Check errors
```

**Build fails:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Tauri build fails:**
- Check Rust version: `rustc --version`
- Update Tauri: `npm update @tauri-apps/cli`

---

## Environment Variables (Optional)

Create `.env` file (not committed):
```env
VITE_APP_VERSION=2.5.0-beta
VITE_BUILD_DATE=2026-05-01
```

Access in code:
```typescript
const version = import.meta.env.VITE_APP_VERSION;
```

---

## Working with Translations

### Adding a New Language
1. Open `locales/`
2. Add language code to `SupportedLocale` type
3. Add translation object following `Translation` interface
4. Test with `App.tsx` locale state

### Translation Rules
- Keep strings concise (max 50 chars for buttons)
- Use `{t('key')}` in components
- Never hardcode strings (except error codes)
- Use people-related terms (see `DESIGN.md`)

---

## Security Considerations for Developers

1. **Never log Vault Key** - Even in development
2. **Never store Vault Key** - Only in memory (`cryptoService.vaultKey`)
3. **Encrypt before localStorage** - Use `encryptString()` / `decryptString()`
4. **Validate inputs** - Especially file names, sizes
5. **Test CSP** - Ensure no inline scripts in production
6. **Cryptographic code is restricted** — Only the project architect and approved external security auditors may modify `utils/crypto.ts`, `utils/cryptoPrimitives.ts`, `utils/streamCrypto.ts`, `utils/backupCrypto.ts`, `utils/metadataCrypto.ts`, or any encryption logic. Contributors must not touch crypto code. Report vulnerabilities via [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories). We prioritize security — vulnerability remediation and response will be as fast as possible.

---

## Performance Tips

1. **Large files** - Use `AES-GCM-Stream` (4MB chunks)
2. **Lazy loading** - Import views only when needed
3. **Memoization** - Use `React.memo()` for FileItem components
4. **IndexeDB** - Don't load all files at once, use pagination

---

## Getting Help

- **GitHub Issues**: https://github.com/ObscuritySecurity/CrytoTool/issues
- **Security Issues**: https://github.com/ObscuritySecurity/CrytoTool/security/advisories — We prioritize security, vulnerability response is as fast as possible.
- **Documentation**: See `README.md` for all doc links

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Check types | `npx tsc --noEmit` |
| Build for web | `npm run build` |
| Build desktop | `npm run tauri build` |
| Build mobile Android | `npm run tauri android build` |
| Build mobile iOS | `npm run tauri ios build` |

**Remember: We build software that respects people. Code accordingly.**
