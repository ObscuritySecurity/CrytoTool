# CrytoTool Development Guide
_Version: 2.5.0-PRO | Last Updated: 2026-05-01_

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
- **Capacitor CLI**: `npm install -g @capacitor/cli`

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
│   ├── security.ts           # PIN, lockout
│   ├── i18n.ts               # 50+ languages
│   └── themes.ts             # Theme configurations
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
├── styles/          # CSS
│   └── glass.css             # Glassmorphism system
│
└── src-tauri/      # Tauri desktop (Rust)
```

### Available Scripts
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build
npm run tauri       # Build Tauri desktop app
npm run cap         # Build Capacitor mobile app
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

3. **Update i18n** - Add keys to ALL 50+ languages in `utils/i18n.ts`

4. **Test build**
   ```bash
   npm run build  # Must pass with no errors
   ```

5. **Update documentation** - `architecture.md`, `SECURITY.md`, or `API.md`

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
npm run tauri
# Output: src-tauri/target/release/
```

**Requirements:**
- Rust installed (https://rustup.rs/)
- System dependencies for Tauri (see https://tauri.app/v1/guides/getting-started/prerequisites)

**First run:**
```bash
npm run tauri dev    # Development with hot reload
```

### Mobile (Capacitor)

#### Android
```bash
npm run build
npx cap add android
npx cap sync
npx cap open android   # Opens Android Studio
```

#### iOS (macOS only)
```bash
npm run build
npx cap add ios
npx cap sync
npx cap open ios     # Opens Xcode
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
VITE_APP_VERSION=2.5.0-PRO
VITE_BUILD_DATE=2026-05-01
```

Access in code:
```typescript
const version = import.meta.env.VITE_APP_VERSION;
```

---

## Working with Translations

### Adding a New Language
1. Open `utils/i18n.ts`
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

---

## Performance Tips

1. **Large files** - Use `AES-GCM-Stream` (4MB chunks)
2. **Lazy loading** - Import views only when needed
3. **Memoization** - Use `React.memo()` for FileItem components
4. **IndexeDB** - Don't load all files at once, use pagination

---

## Getting Help

- **GitHub Issues**: https://github.com/ObscuritySecurity/CrytoTool/issues
- **Security Issues**: https://github.com/ObscuritySecurity/CrytoTool/security/advisories
- **Documentation**: See `README.md` for all doc links

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Check types | `npx tsc --noEmit` |
| Build for web | `npm run build` |
| Build desktop | `npm run tauri` |
| Build mobile | `npm run cap` |
| Add Android | `npx cap add android` |
| Add iOS | `npx cap add ios` |
| Sync Capacitor | `npx cap sync` |

**Remember: We build software that respects people. Code accordingly.**
