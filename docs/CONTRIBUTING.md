# Contributing to CrytoTool

Thank you for your interest in contributing! CrytoTool respects the people behind the screen, and we welcome contributions that align with our mission of privacy-first, secure software.

By submitting a pull request, you agree that your contribution is licensed under AGPL-3.0.

## How to Contribute

### Reporting Issues
- Use [GitHub Issues](https://github.com/ObscuritySecurity/CrytoTool/issues) to report bugs
- Include: steps to reproduce, expected behavior, actual behavior, screenshots if UI-related
- For security vulnerabilities, please use [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) instead of public issues. We prioritize security — vulnerability remediation and response will be as fast as possible.

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
- **Cryptographic code is restricted to the project architect and approved external security auditors.** Contributors must never modify `utils/crypto.ts`, `utils/cryptoPrimitives.ts`, `utils/streamCrypto.ts`, `utils/backupCrypto.ts`, `utils/metadataCrypto.ts`, or any encryption-related logic. Report vulnerabilities via [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) — do not open public issues or PRs for crypto flaws. We prioritize security — vulnerability remediation and response will be as fast as possible.

### UI/UX Requirements
- Follow glassmorphism design (`styles/glass.css`)
- Use `t('key')` for all text (never hardcode strings)
- Support all 50+ languages — update English source strings in `utils/i18n.ts` (other languages are translated by the community)
- Responsive design: mobile-first, test at 375px and 1920px (test via browser DevTools at 375px)
- Animations via Framer Motion with presets from `DESIGN.md`

### Commit Messages
```
type(scope): brief description

Examples:
feat(ui): add glassmorphism hover effects to file cards
fix(docs): correct broken link in README
docs(readme): update documentation links
style(ui): apply glassmorphism to new modal
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Development Setup
```bash
git clone https://github.com/ObscuritySecurity/CrytoTool.git
cd CrytoTool
npm install
npm run dev
```

## Testing
```bash
npm run build  # Must pass with no TypeScript errors
npm run tauri  # Desktop build test (mandatory for src-tauri/ changes)
```
Unit tests for crypto primitives are planned.

## Review Checklist
Before submitting your PR, ensure:
- [ ] Build passes (`npm run build`)
- [ ] Uses "people"/"persoane" terminology
- [ ] No hardcoded strings (use `t('key')`)
- [ ] **PR does not modify cryptographic code, key derivation, or encryption algorithms**
- [ ] Updates documentation if adding features
- [ ] Follows glassmorphism design
- [ ] Works on mobile and desktop viewports
- [ ] English source strings updated in utils/i18n.ts
- [ ] Other languages marked with // TODO: translate if not updated
- [ ] No console errors or warnings
- [ ] Security-related code reviewed against `SECURITY.md`

## Decision Making
- Technical disputes are resolved by project maintainers
- For major architectural changes, open a discussion before PR
- Security-related decisions are final and non-negotiable

## Community
- Be respectful to other contributors
- We build software that respects people
- Questions? Open a discussion or issue

Thank you for helping make CrytoTool better for everyone. We build this project with love and respect for every single person who contributes.
