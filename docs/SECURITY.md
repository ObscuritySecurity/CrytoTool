# CrytoTool Security Documentation
_Version: 2.5.0-beta | Last Updated: 2026-05-27_

## Security Philosophy
**CrytoTool respects the people behind the screen.** Security is not just about code — it's about protecting people's digital lives. Every security decision prioritizes human safety over convenience.

---

## 1. Threat Model

### What We Protect Against (Attack Surface Covered)

| Attack | How We Protect | Status |
|--------|----------------|--------|
| **Master Password Brute-force** | Argon2id (128MB memory, 19 iterations, 4 threads) — drastically slows down brute-force | ✅ Protected |
| **Physical Device Access** | Vault Key only in memory (RAM), cleared on lock; IndexedDB encrypted with AES-GCM | ✅ Protected |
| **Browser localStorage Access** | Manual encryption keys are now encrypted with Vault Key (AES-256-GCM) before storage | ✅ Protected (from commit 0201163) |
| **Algorithm Collision** | Standard algorithms: AES-256-GCM, Argon2id, PBKDF2-SHA256, ChaCha20-Poly1305 | ✅ Protected |
| **Multi-person Access on Same Device** | Auto-lock after inactivity, Progressive Lockout, Self-Destruct option | ✅ Protected |
| **Password Loss** | 10 unique recovery codes | ✅ Protected |
| **Supply Chain Attacks (compromised npm packages)** | Regular `npm audit`, minimal dependencies (`hash-wasm`, `libsodium-wrappers`) | ⚠️ Monitored |

### Extreme Cases (Remaining Risks)

| Scenario | Why Not Fully Protected | Possible Mitigation |
|-----------|---------------------|----------------------|
| **XSS in Application** | If attacker can execute JS, they can access `cryptoService.vaultKey` (object in memory) | Content Security Policy (CSP) implemented via `<meta>` tag in `index.html` (disallows inline scripts) |
| **Malicious Browser Extension** | Extensions have access to localStorage and can inject scripts | We have no control; people should only install trusted extensions |
| **Physical RAM Dumping** | If attacker can read browser process memory, Vault Key can be extracted | `CryptoKey` is already non-extractable (`extractable: false`) |
| **Supply Chain Attack on `npm`** | A compromised library could exfiltrate data via `postMessage` or `fetch` | `npm audit`, limiting dependencies, CVE monitoring |
| **Social Engineering** | A person can be tricked into revealing their password | Education, clear interface |

---

## 2. Security Architecture Decisions

### Why Argon2id for Master Password?
- **Winner**: Password Hashing Competition (2015), recommended by OWASP
- **Memory-hard**: Uses 128MB RAM — drastically slows down GPU brute-force (which have limited memory)
- **Tuning**: 19 iterations (balance between security and speed on mobile devices)
- **Implementation**: `hash-wasm` (wasm bindings for Argon2id), not `libsodium` (which doesn't have Argon2id natively in WASM)

### Why AES-GCM?
- **Authenticated**: Provides both confidentiality AND integrity (GCM tag of 128 bits)
- **Industry Standard**: Recommended by NIST, used by banks and governments
- **Native in Browser**: Web Crypto API supports AES-GCM natively (hardware acceleration on most devices)
- **256 bits**: Resistant to quantum attacks (when they arrive)

### Why Vault Key Only in Memory?
- **Principle**: If it's not on disk, it can't be read from disk
- **Storage**: `cryptoService.vaultKey` is a `CryptoKey` object (or `null`). Set in `crypto.ts:36-55` on unlock, cleared in `crypto.ts:62` on lock
- **localStorage**: We don't store the key here, although we could store a `non-extractable CryptoKey` — we chose not to for XSS safety
- **IndexedDB**: We don't store keys here because IndexedDB is accessible via JS (XSS)

### Cryptographic Isolation (Defense in Depth)
- **`cryptoPrimitives.ts`**: Each algorithm is isolated in its own module. No dependencies between them (avoids domino effects)
- **`streamCrypto.ts`**: Streaming is separate from standard encryption. Uses Argon2id (hash-wasm) for key derivation, not Vault Key directly. Chunk IVs derived via HMAC-SHA256
- **`backupCrypto.ts`**: Backup key is derived independently (Argon2id, 19 iterations, 128MB memory) — doesn't use Vault Key
- **`vaultStorage.ts` (updated)**: Manual keys are encrypted with Vault Key before localStorage. If Vault Key is cleared (lock), stored keys become unreadable

---

## 3. Attack Surface

### What is Exposed to Attackers:

| Component | What it Exposes | Risk |
|-----------|------------------|------|
| **localStorage** | `crytotool_salt`, `crytotool_iv`, `crytotool_vault_pin_hash` (encrypted), `crytotool_recovery_codes` (encrypted), `crytotool_vault_cats`, `crytotool_theme_config` | Access via XSS, disk reading |
| **IndexedDB** | Encrypted files, metadata (name, size, date) | Access via XSS (if Vault Key is available) |
| **Web Crypto API** | `CryptoKey` objects in memory | Extraction from RAM (protected by browser's sandbox) |
| **URL/History** | We don't store sensitive params in URL | Minimal risk (SPA without server) |
| **Service Workers** | Not used yet | N/A |
| **Iframes** | Not used | N/A |

### What is NOT Exposed:
- Master Password (only Argon2id hash in memory temporarily)
- Vault Key (only in memory, cleared on lock)
- Manual keys (encrypted in localStorage, encrypted with Vault Key)

---

## 4. Incident Response

### Progressive Lockout (`utils/security.ts:23-29`)
- **Trigger**: 3+ failed unlock attempts (Master Password or PIN)
- **Action**:
  - 3 failures → 30 second lock
  - 4 failures → 1 minute lock
  - 5+ failures → 5 minute lock
- **Implementation**: `getBackoffTime(failedAttempts)` returns time in seconds

### Self-Destruct (`App.tsx:78-108`)
- **Configuration**: `autoDestructEnabled`, `autoDestructAttempts`, `autoDestructInactivity`
- **Trigger 1 (Failed Attempts)**: If `failedAttempts >= autoDestructAttempts` and `autoDestructEnabled === true` → complete wipe of IndexedDB + localStorage
- **Trigger 2 (Inactivity)**: If `elapsed >= autoDestructInactivity` seconds → countdown `destructCountdownSeconds` (default 30s) → complete wipe
- **Grace Period**: Before deletion, a visual countdown runs. A person can cancel if they enter the correct password in time

### Dead Man Switch (`App.tsx:110-145`)
- **Function**: Monitors person's activity (`mousedown`, `mousemove`, `keydown`, `touchstart`, `scroll`)
- **Timer Reset**: Any activity resets `lastActivityRef.current`
- **Progressive Actions**:
  1. `elapsed >= autoBlurSeconds` → blur screen (isBlurred = true)
  2. `elapsed >= autoLockSeconds` → lock vault (isAuthenticated = false)
  3. `elapsed >= autoDestructInactivity` → trigger Self-Destruct

---

## 5. Audit Guidelines

### How to Audit CrytoTool Code for Security:

#### `utils/crypto.ts` (Master Key Derivation + Encryption)
- ✅ Check: Argon2id params (memory: 131072, iterations: 19, parallelism: 4)
- ✅ Check: `vaultKey` is set/cleared correctly (not remaining in memory after lock)
- ✅ Check: `encryptString()` / `decryptString()` use AES-GCM with randomly generated IV
- ✅ Check: `vaultKey` is private — not accessible via XSS

#### `utils/vaultStorage.ts` (Encrypted Vault Keys)
- ✅ Check: `saveAll()` encrypts JSON with `cryptoService.encryptString()`
- ✅ Check: `getAll()` decrypts before returning
- ✅ Check: Legacy format (plaintext) is migrated correctly on first save
- ✅ Check: Uses `cryptoService.encryptString()` / `decryptString()` with Vault Key

#### `utils/backupCrypto.ts` (Backup Encryption)
- ✅ Check: Argon2id for backup key derivation (19 iterations, 128MB memory)
- ✅ Check: Random salt (16 bytes) generated for each backup
- ✅ Check: Format `[salt][iv][ciphertext+GCM tag]` is respected
- ✅ Check: Backup keys generated with 130-bit entropy (26 chars)

#### `utils/security.ts` (PIN + Lockout)
- ✅ Check: PIN hash uses PBKDF2-SHA256 with random salt
- ✅ Check: `verifyPin()` uses constant-time comparison (`diff |= ...`)
- ✅ Check: PIN hash is encrypted with Vault Key before localStorage

#### `utils/cryptoPrimitives.ts` (Isolated Algorithms)
- ✅ Check: Each algorithm is isolated (no shared state)
- ✅ Check: `aesCtr` uses HKDF native (WebCrypto) for key derivation (encryption + MAC keys)
- ✅ Check: `chacha20Poly1305` / `xchacha20Poly1305` use libsodium (WASM) — intensively audited
- ⚠️ Note: `aesGcm` imports `CryptoKey` on each call (performance, but secure)

#### `App.tsx` (State Management + Incident Response)
- ✅ Check: `destructTriggerTime` is saved in localStorage (persists between reloads)
- ✅ Check: `lastActivityRef` is updated on every activity event
- ✅ Check: Recovery codes encrypted with Vault Key
- ✅ Check: All sensitive states (`settingsPassword`, `vaultPin`) are in `useState`, not global variables

---

## 6. Dependencies Security

### `hash-wasm` (Argon2id implementation)
- **Version**: Check `package.json`
- **CVE**: No known CVEs for `hash-wasm`
- **Risk**: WASM binary loaded in browser — if CDN is compromised (not our case, it's local in `node_modules`), attacker could inject code
- **Update**: `npm update hash-wasm`

### `libsodium-wrappers` (ChaCha20, XChaCha20, Salsa20, BLAKE2b)
- **Version**: Check `package.json`
- **CVE**: No recent CVEs for libsodium (library is intensively audited, written in C)
- **Risk**: WASM wrapper (31KB) — small attack surface
- **Update**: `npm update libsodium-wrappers`

### `framer-motion` (Animations)
- **Version**: Check `package.json`
- **CVE**: Monitor `npm audit` for XSS CVEs in animations
- **Risk**: Large library (100KB+) — potentially XSS if not used correctly
- **Mitigation**: We only use `motion.div`, `AnimatePresence` — no advanced functions

### `lucide-react` (Icons)
- **Version**: Check `package.json`
- **CVE**: Minimal risk (just SVG icons)
- **Risk**: Icons are React components — if malicious code injected in SVG, could cause XSS
- **Mitigation**: We use standard icons, no user-customized SVGs

---

## 7. Cryptographic Code Governance

CrytoTool's cryptographic code is **strictly governed** to ensure the safety of people's data:

- **Only the project architect or approved external security auditors** may modify, add, or remove encryption algorithms, key derivation functions, or cryptographic primitives.
- **Contributors must not submit PRs** that touch `utils/crypto.ts`, `utils/cryptoPrimitives.ts`, `utils/streamCrypto.ts`, `utils/backupCrypto.ts`, `utils/metadataCrypto.ts`, or any file containing encryption logic.
- **Vulnerability reporting**: If you discover a cryptographic flaw, report it via the [Security Vulnerability template](https://github.com/ObscuritySecurity/CrytoTool/issues/new?template=security_vulnerability.md) or [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) for critical vulnerabilities.
- **Rationale**: Encryption is the foundation of trust. A single mistake in key derivation or algorithm implementation can compromise all people's data. Restricting crypto changes to the architect and approved auditors minimizes this risk.

---

## 8. Checklist for Security Review

Before releasing a new version, verify:

- [ ] `npm audit` — zero high/critical vulnerabilities
- [ ] Argon2id params unchanged (memory: 131072, iterations: 19)
- [ ] AES-GCM IV is randomly generated for each encryption (12 bytes)
- [ ] Vault Key is cleared from memory on lock (`cryptoService.clearKeys()`)
- [ ] `vaultStorage` saves keys encrypted (check localStorage for `crytotool_vault_keys` — should be `{iv, data}`, not plaintext)
- [ ] PIN hash in localStorage is encrypted with Vault Key (check `crytotool_vault_pin_hash`)
- [ ] Recovery codes in localStorage are encrypted with Vault Key (check `crytotool_recovery_codes`)
- [ ] Progressive Lockout works (test 3+ failed attempts)
- [ ] Self-Destruct can be triggered manually and automatically
- [ ] Recovery codes display correctly and work
- [ ] No "users" term in UI (use "people" / "persoane")
- [ ] CSP meta tag is present in `index.html`

---

## External Resources
- **OWASP Top 10 Client-Side Security Risks**: https://owasp.org/www-project-top-10-client-side-security-risks/
- **Web Crypto API Security**: https://www.w3.org/TR/WebCryptoAPI/
- **Argon2 Specification**: https://github.com/P-H-C/phc-winner-argon2
- **IndexedDB Security (Firefox Private Mode Research)**: https://dfrws.org/wp-content/uploads/2024/07/Decrypting-IndexedDB-in-private-mode-o_2024_Forensic-Science-International-.pdf

---

## Reporting Security Issues
If you discover a vulnerability, report it through the [Security Vulnerability template](https://github.com/ObscuritySecurity/CrytoTool/issues/new?template=security_vulnerability.md) or [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) for critical issues. We respect the people who help us become more secure.
