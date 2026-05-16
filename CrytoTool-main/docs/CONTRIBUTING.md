# Contributing to CrytoTool

Thank you for your interest in contributing! CrytoTool respects the people behind the screen, and we welcome contributions that align with our mission of privacy-first, secure software.

## How to Contribute

### Reporting Issues
- Use [GitHub Issues](https://github.com/ObscuritySecurity/CrytoTool/issues) to report bugs
- Include: steps to reproduce, expected behavior, actual behavior, screenshots if UI-related
- For security vulnerabilities, please use [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) instead of public issues

### Suggesting Features
- Open an issue with label `enhancement`
- Explain how the feature benefits the people using CrytoTool
- Discuss implementation approach before starting work on major features

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Test thoroughly (build must pass: `npm run build`)
5. Commit with clear messages (English only)
6. Push to your fork and open a Pull Request

## Coding Standards

### Terminology (Mandatory)
- Use **"persoane"** (RO) / **"people"** (EN) in all UI text and documentation
- Never use **"utilizatori"** (RO) / **"users"** (EN)
- Use **"unlock"** not "login", **"lock"** not "logout"

### Code Style
- TypeScript strict mode (already enabled)
- English comments only (for international contributors)
- Follow existing patterns in the codebase
- Use functional React components with hooks

### Security Requirements
- All cryptographic code must use Web Crypto API or audited libraries (`hash-wasm`, `libsodium-wrappers`)
- Vault Key must never be written to disk (only in memory)
- New crypto features require update to `SECURITY.md` and `architecture.md`

### UI/UX Requirements
- Follow glassmorphism design (`styles/glass.css`)
- Use `t('key')` for all text (never hardcode strings)
- Support all 50+ languages (update `utils/i18n.ts`)
- Responsive design: mobile-first, test at 375px and 1920px
- Animations via Framer Motion with presets from `DESIGN.md`

### Commit Messages
```
type(scope): brief description

Examples:
feat(security): add Argon2id memory parameter to UI
fix(crypto): correct IV generation for AES-GCM
docs(readme): update documentation links
style(ui): apply glassmorphism to new modal
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Development Setup
```bash
git clone https://github.com/YOUR_USERNAME/CrytoTool.git
cd CrytoTool
npm install
npm run dev
```

## Testing
```bash
npm run build  # Must pass with no TypeScript errors
npm run tauri  # Test desktop build (optional)
```

## Review Checklist
Before submitting your PR, ensure:
- [ ] Build passes (`npm run build`)
- [ ] Uses "people"/"persoane" terminology
- [ ] No hardcoded strings (use `t('key')`)
- [ ] Updates documentation if adding features
- [ ] Follows glassmorphism design
- [ ] Works on mobile and desktop viewports
- [ ] All 50+ languages updated (or marked for translation)
- [ ] No console errors or warnings
- [ ] Security-related code reviewed against `SECURITY.md`

## Community
- Be respectful to other contributors
- We build software that respects people
- Questions? Open a discussion or issue

Thank you for helping make CrytoTool better for everyone!
