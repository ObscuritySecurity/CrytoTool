# CrytoTool Release Guide
_Version: 2.5.0-beta | Last Updated: 2026-05-27_

This document describes how to create and publish new releases of CrytoTool for web, desktop (Tauri), and mobile (Tauri v2).

---

## Version Numbering

CrytoTool follows [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH-SUFFIX
  2    .  5  .  0  -beta
│       │      │      │
│       │      │      └─ Suffix: BETA, ALPHA, RC1, etc.
│       │      └──────── Patch: Bug fixes, small changes
│       └───────────── Minor: New features, backward-compatible
└───────────────────── Major: Breaking changes
```

### Current Version
- **Version**: `2.5.0-beta`
- **Location**: `package.json` (line with `"version"`)

### When to Bump Version
- **MAJOR** (`3.0.0`): Breaking changes, major UI overhaul, crypto changes
- **MINOR** (`2.6.0`): New features, new algorithms, new views
- **PATCH** (`2.5.1`): Bug fixes, documentation updates, small improvements

---

## Release Checklist

### Pre-Release
- [ ] All tests pass (`npm run build` with no errors)
- [ ] Documentation updated (`README.md`, `CHANGELOG.md`, `SECURITY.md`, etc.)
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated with new version section
- [ ] Security review completed (especially for crypto changes)
- [ ] English source strings updated (other languages translated by community)
- [ ] No console errors or warnings
- [ ] Tested on mobile (375px) and desktop (1920px)
- [ ] CSP meta tag present in `index.html`

### Release Steps
1. [ ] Create release branch `release/vX.Y.Z`
2. [ ] Update version in `package.json`
3. [ ] Update version in all docs (`SECURITY.md`, `DESIGN.md`, `ARCHITECTURE.md`, etc.)
4. [ ] Build and test all platforms
5. [ ] Commit and push release branch
6. [ ] Create GitHub Release
7. [ ] Tag the release
8. [ ] Build desktop apps (Tauri)
9. [ ] Build mobile apps (Tauri v2)
10. [ ] Attach assets to GitHub Release

---

## Building for Release

### Web Release
```bash
# Clean previous build
rm -rf dist/

# Build
npm run build

# Output: dist/ folder
# Upload to your web host
```

**Output files:**
- `dist/index.html`
- `dist/assets/*.js`
- `dist/assets/*.css`

---

### Desktop Release (Tauri)

#### Prerequisites
- Rust installed and up to date
- Tauri CLI: `npm install @tauri-apps/cli`

#### Build Commands
```bash
# Development test
npm run tauri dev

# Production build
npm run tauri build

# Output: src-tauri/target/release/bundle/
```

**Output formats:**
- **Windows**: `.msi`, `.nsis`
- **macOS**: `.dmg`, `.app`
- **Linux**: `.AppImage`, `.deb`, `.rpm`

#### Code Signing (Optional but Recommended)
Configure in `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "signCommand": "signtool sign ..."
    },
    "macOS": {
      "identity": "Developer ID Application: Your Name (TEAMID)"
    }
  }
}
```

---

### Mobile Release (Tauri v2)

Tauri v2 has built-in mobile support for Android and iOS:

```bash
# Add Android/iOS platform support
npm run tauri android init
npm run tauri ios init

# Build for Android
npm run tauri android build

# Build for iOS (macOS only)
npm run tauri ios build
```

**Output:**
- **Android**: `src-tauri/gen/android/app/build/outputs/apk/`
- **iOS**: `src-tauri/gen/ios/`

See [Tauri v2 Mobile Guide](https://v2.tauri.app/start/mobile/) for full setup instructions.

---

## Creating a GitHub Release

### 1. Tag the Release
```bash
# Update version
npm version 2.5.1  # or whatever version

# Push tag
git push origin v2.5.1
```

### 2. Create Release on GitHub
1. Go to https://github.com/ObscuritySecurity/CrytoTool/releases/new
2. Choose tag: `v2.5.1`
3. Release title: `CrytoTool v2.5.0-beta`
4. Description: Copy from `CHANGELOG.md` for this version

### 3. Attach Assets
Upload the following:
- `CrytoTool-Setup-2.5.1.exe` (Windows installer)
- `CrytoTool-2.5.1.dmg` (macOS)
- `CrytoTool-2.5.1.AppImage` (Linux)
- `CrytoTool-2.5.1.apk` (Android, if built)
- `CHANGELOG.md` (for reference)

### 4. Publish Release
- Check "Set as pre-release" for BETA/ALPHA versions
- Click "Publish release"

---

## Release Notes Template

```markdown
## CrytoTool v2.5.0-beta

### 🔒 Security
- [Security-related changes]

### ✨ New Features
- [New features added]

### 🐛 Bug Fixes
- [Bugs fixed]

### 📚 Documentation
- [Docs updated]

### 🔄 Dependencies
- Updated `hash-wasm` to vX.Y.Z
- Updated `libsodium-wrappers` to vX.Y.Z

### 📥 Downloads
- **Windows**: [CrytoTool-Setup-2.5.1.exe](https://github.com/ObscuritySecurity/CrytoTool/releases/download/v2.5.1/CrytoTool-Setup-2.5.1.exe)
- **macOS**: [CrytoTool-2.5.1.dmg](...)
- **Linux**: [CrytoTool-2.5.1.AppImage](...)
- **Android**: [CrytoTool-2.5.1.apk](...)

### 📝 Upgrade Notes
[Special instructions for upgrading]

**Full Changelog**: [v2.5.0...v2.5.1](https://github.com/ObscuritySecurity/CrytoTool/compare/v2.5.0...v2.5.1)
```

---

## CI/CD (Optional)

### GitHub Actions Example
Create `.github/workflows/release.yml`:
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install Rust
        run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
      - name: Install dependencies
        run: npm install
      - name: Build Tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Hotfix Releases

For critical security fixes:

1. Create branch from the affected release tag:
   ```bash
   git checkout v2.5.0
   git checkout -b hotfix/security-patch
   ```

2. Make the fix, update version to `2.5.1`

3. Update `SECURITY.md` with details

4. Commit, tag, and release immediately

5. Backport to `main` branch

---

## Post-Release

- [ ] Announce on project's communication channels
- [ ] Update README if major version change
- [ ] Monitor GitHub Issues for regressions
- [ ] Close milestones associated with the release

---

## Important Notes

1. **Never commit secrets** - No keys, passwords, or certificates in the repo
2. **Test thoroughly** - Especially crypto changes (can cause data loss)
3. **Backup before release** - Ensure people can restore from previous backups
4. **Sign releases** - Code signing increases trust (especially on Windows/macOS)
5. **Document breaking changes** - Clearly in release notes

---

## Version History Reference

| Version | Date | Highlights |
|---------|------|-----------|
| 2.5.0-beta | 2026-05-27 | Current release — see CHANGELOG.md |

---

**Remember: Every release affects people's data. Test carefully and respect their trust.**
