## Description

<!-- Provide a clear, concise description of the changes introduced by this PR. What problem does it solve? What is the expected outcome? -->

**Related issue:** <!-- Closes #..., Fixes #..., Part of #... -->

---

## Type of change

<!-- Mark relevant options with an "x". Delete options that are not relevant. -->

- [ ] **Bug fix** — non-breaking change that fixes an issue
- [ ] **New feature** — non-breaking change that adds functionality
- [ ] **Security fix** — addresses a vulnerability or cryptographic weakness
- [ ] **Performance improvement** — makes something faster or less resource-intensive
- [ ] **Refactor** — code restructuring without functional changes
- [ ] **UI/UX change** — modifies the interface or user experience
- [ ] **Documentation** — changes to docs, comments, or metadata
- [ ] **CI / build / dependencies** — build system, CI config, or dependency updates
- [ ] **i18n / l10n** — translations or locale support
- [ ] **Breaking change** — existing functionality will break after merge

---

## What changed?

<!-- List the key changes made. Be specific — mention files, components, or functions modified. -->

### Added
- <!-- e.g. New encryption utility in utils/crypto.ts -->

### Changed
- <!-- e.g. Updated AuthScreen to use Argon2id with 128MB memory -->

### Fixed
- <!-- e.g. Fixed race condition in file decryption (utils/crypto.ts:142) -->

### Removed
- <!-- e.g. Removed deprecated backup function -->

---

## How to test

<!-- Provide step-by-step instructions to verify the changes. Include any specific setup required. -->

### Prerequisites
-
### Steps
1.
2.
3.
### Expected result
-

---

## Platform testing

<!-- Mark each platform you have tested on. If a platform is not applicable, mark N/A. -->

| Platform          | Tested | Notes                        |
| ----------------- | ------ | ---------------------------- |
| Desktop Linux     | [ ]    |                              |
| Desktop Windows   | [ ]    |                              |
| Desktop macOS     | [ ]    |                              |
| Android (Capacitor) | [ ] |                              |
| iOS (Capacitor)   | [ ]    |                              |
| Web (dev server)  | [ ]    |                              |

---

## Security & cryptographic review

<!-- For any change that touches encryption, key derivation, authentication, or data handling, fill out this section. Delete if not applicable. -->

- [ ] This PR does **not** modify any security-critical code

### If it does:
- **Encryption algorithm(s) affected:** <!-- e.g. AES-256-GCM, Argon2id -->
- **Key material affected:** <!-- e.g. Master key derivation, file encryption keys, PIN hash -->
- **Data flow change:** <!-- Briefly describe how data is encrypted/decrypted/signed before vs after -->
- **Cryptographic review needed:** [ ] Yes [ ] No
- **Existing tests cover this change:** [ ] Yes [ ] No [ ] N/A

---

## Protocol-3305 alignment

<!--
CrytoTool is built on Protocol-3305 (https://github.com/ObscuritySecurity/protocol-3305).
Indicate which articles this PR impacts and how.
-->

| Article | Status | Notes |
| ------- | ------ | ----- |
| Art. 0 — Ethical Monetization | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 1 — Privacy by Design | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 2 — Security by Default | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 3 — Zero Trust | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 4 — Zero Knowledge | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 5 — Zero Personal Data Collection | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 6 — Zero Activity Logs | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 7 — Open Source | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |
| Art. 8 — Zero Non-Essential Permissions | [ ] 🟢 Compliant [ ] 🟡 Affected [ ] 🔴 Violation | |

---

## Breaking changes & migration

<!-- If this PR introduces a breaking change, describe what breaks and how to migrate. Delete if not applicable. -->

- **What breaks:**
- **Migration path:**
- **Backward compatibility guaranteed:** [ ] Yes [ ] No

---

## Performance impact

<!-- Describe any measurable performance impact. Include before/after metrics where possible. Delete if not applicable. -->

- **Metric:** <!-- e.g. File decryption time, memory usage, bundle size -->
- **Before:** 
- **After:** 

---

## Dependencies

<!-- List any dependencies added or removed. Include versions. -->

- **Added:** <!-- e.g. hash-wasm@4.11.0 -->
- **Removed:** <!-- e.g. bcryptjs -->
- **Updated:** <!-- e.g. react@18.3.0 → 19.0.0 -->

---

## Screenshots / recordings

<!-- If applicable, add screenshots or screen recordings to help explain the change. Drag and drop images here. -->

---

## Checklist

<!-- Confirm each item is complete. Mark with "x". -->

- [ ] My code follows the existing project conventions and style
- [ ] I have performed a self-review of my own code
- [ ] I have commented on complex or non-obvious areas (in English, per project convention)
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing tests pass locally
- [ ] TypeScript compilation produces no errors (`npx tsc --noEmit`)
- [ ] Any new translatable strings have been added to the i18n system
- [ ] Documentation (README, docs/) has been updated to reflect my changes
- [ ] My commits follow the existing commit message style
- [ ] I have verified this change does not introduce any new tracking, telemetry, or data collection

---

## Additional context

<!-- Add any other context about the PR here. For example, design decisions, trade-offs, future considerations. -->

---

<!-- Thank you for contributing to CrytoTool. Every PR helps make privacy better for everyone. -->
