# CrytoTool Security Documentation
_Version: 2.5.0-PRO | Last Updated: 2026-05-30_

## Security Philosophy
**CrytoTool respects the people behind the screen.** Security is not just about code — it's about protecting people's digital lives. Every security decision prioritizes human safety over convenience.

**Core Principle:** CrytoTool is a **local-first, client-side encrypted file vault**. It has **no server, no cloud, no telemetry, no tracking**. This architectural choice eliminates entire categories of threats that cloud-based alternatives cannot avoid.

---

## 1. Threat Model

### Audience-Specific Threat Models

Different people face different adversaries. CrytoTool is designed to cover all these profiles through layered, configurable security features.

#### Ordinary People / Privacy-Conscious Civilians

| Aspect | Detail |
|--------|--------|
| **Adversary** | Data brokers, ad tech, low-level fraud, phishing, credential stuffing, casual device access (family/roommates) |
| **Assets** | Personal photos, documents, financial records, passwords, browsing habits |
| **Capabilities** | Phishing emails, SIM swaps, credential reuse attacks, malware downloads, physical access to unlocked device |
| **Consequences** | Identity theft, financial loss, reputation damage, doxxing |
| **Recommended Features** | Master Password, Auto-Lock, Visual Obfuscation, PIN Vault, Unique Key Per File |
| **Example** | A journalist's family member borrows their laptop — CrytoTool's auto-lock and blur prevent accidental exposure. A phishing link is clicked — the vault key is in memory only, not on disk. |

#### Journalists & Media Workers

| Aspect | Detail |
|--------|--------|
| **Adversary** | State intelligence agencies, corporate security, law enforcement, spyware operators (Pegasus, Graphite, Predator) |
| **Assets** | Source identities, unpublished investigations, confidential documents, communication metadata |
| **Capabilities** | Subpoenas, device seizure at borders, forensic extraction (Cellebrite UFED, Oxygen Forensics), spyware injection, lawful interception (LI) gateways, network metadata analysis, phishing campaigns |
| **Consequences** | Source imprisonment, physical harm, legal retaliation, deportation, murder |
| **Recommended Features** | Master Password (30+ chars), Self-Destruct, Progressive Lockout, Encrypted Metadata, Dead Man Switch |
| **Example** | A journalist is stopped at a border with a device containing sensitive source files. If Self-Destruct is enabled and configured for low failed-attempt threshold, entering the wrong password triggers a complete wipe before forensic tools can extract data. The Dead Man Switch ensures the vault locks automatically if the journalist is separated from the device. |

**2026 Context:** Commercial spyware (NSO's Pegasus, Paragon's Graphite) is now deployed by democratic governments against journalists. Serbia used Cellebrite to unlock phones and implant NoviSpy malware. Greece abused lawful interception against reporters. Spyware can exfiltrate all device data without the journalist knowing. CrytoTool's local-first, zero-server architecture means there's **no cloud account to compromise, no server to subpoena, no telemetry to intercept.**

#### Activists (Authoritarian Regimes)

| Aspect | Detail |
|--------|--------|
| **Adversary** | State security services, informants, state-sponsored hackers, censorship authorities |
| **Assets** | Physical location, associate identities, protest coordination, evidence of government abuse, communication logs |
| **Capabilities** | Physical raids, device seizure, IMSI catchers, network blocks, torture/coercion, social engineering, informant networks |
| **Consequences** | Arrest, torture, disappearance, death, family retaliation |
| **Recommended Features** | Self-Destruct, Dead Man Switch, Progressive Lockout, Encrypted Metadata, PIN Vault, Master Password |
| **Example** | During a police raid, an activist's phone is seized. The vault is locked. If Self-Destruct is triggered by failed attempts, all data is wiped before forensic extraction. Even if the device is cloned, the vault key is never stored on disk. |

#### Whistleblowers

| Aspect | Detail |
|--------|--------|
| **Adversary** | Employer, corporate security, government agencies, forensic investigators |
| **Assets** | Evidence documents, internal communications, identity protection |
| **Capabilities** | Workplace surveillance, device monitoring, legal threats, forensic analysis, subpoenas |
| **Consequences** | Termination, legal prosecution, blacklisting, imprisonment |
| **Recommended Features** | Self-Destruct, Backup Encryption, Master Password, Encrypted Metadata |

---

### Attack Surface Covered

| Attack | How We Protect | Status |
|--------|----------------|--------|
| **Master Password Brute-force** | Argon2id (128MB memory, 19 iterations, 4 threads) — drastically slows down GPU/ASIC brute-force | ✅ Protected |
| **Physical Device Access** | Vault Key only in memory (RAM), cleared on lock; IndexedDB encrypted with AES-256-GCM | ✅ Protected |
| **Browser localStorage Access** | No sensitive data stored in plaintext. Vault keys encrypted before storage | ✅ Protected (from commit 0201163) |
| **Algorithm Collision** | Standard algorithms: AES-256-GCM, Argon2id, PBKDF2-SHA256 (100K), ChaCha20-Poly1305, XChaCha20-Poly1305, Salsa20-Poly1305 | ✅ Protected |
| **Multi-person Access on Same Device** | Auto-lock after inactivity, Progressive Lockout, Self-Destruct option | ✅ Protected |
| **Password Loss** | 10 unique recovery codes (single-use) for master password reset without data loss | ✅ Protected |
| **Supply Chain Attacks (compromised npm packages)** | Regular `npm audit`, minimal dependencies (`hash-wasm`, `libsodium-wrappers`) | ⚠️ Monitored |
| **Cloud/Server Compromise** | No server. Zero cloud. Zero telemetry. Nothing to subpoena, nothing to hack | ✅ Architecture eliminates this |
| **Forensic Device Extraction (Cellebrite/Oxygen)** | Vault key in RAM only, cleared on lock. Self-Destruct can wipe before extraction completes | ✅ Protected (when locked) |
| **Commercial Spyware (Pegasus/Graphite)** | No cloud account, no server API, no telemetry. Spyware can keylog the master password — Self-Destruct can mitigate | ⚠️ Partially protected |

### Extreme Cases (Remaining Risks)

| Scenario | Why Not Fully Protected | Possible Mitigation |
|-----------|---------------------|----------------------|
| **XSS in Application** | If attacker can execute JS, they can access `cryptoService.vaultKey` (object in memory) | CSP in Tauri config and `<meta>` tag |
| **Malicious Browser Extension** | Extensions have access to localStorage and can inject scripts | We have no control; people should only install trusted extensions |
| **Physical RAM Dumping** | If attacker can read browser process memory (requires kernel-level access), Vault Key can be extracted | Use `non-extractable CryptoKey` in future, encrypted memory |
| **Supply Chain Attack on `npm`** | A compromised library could exfiltrate data via `postMessage` or `fetch` | `npm audit`, limiting dependencies, CVE monitoring, lockfile |
| **Social Engineering** | A person can be tricked into revealing their password | Education, clear interface |
| **Spyware Keylogging Master Password** | If a device is compromised with spyware, the master password can be captured on entry | Self-Destruct on failed attempts can limit damage; use a separate trusted device |
| **Compulsion/Coercion** | A person can be forced to unlock the vault under duress | No technical solution for $5 wrench attack. See Sanctum-style plausible deniability (future feature) |

---

## 2. Feature-to-Threat Mapping

| Feature | What It Protects Against | Audience |
|---------|-------------------------|----------|
| **Master Password (30+ characters)** | Brute-force, credential stuffing, shoulder surfing | All |
| **Progressive Lockout** | Brute-force, physical access attacks, automated guessing | All |
| **Self-Destruct** | Device seizure, forensic extraction, torture/coercion, spyware | Journalists, Activists, Whistleblowers |
| **Dead Man Switch (Auto-Lock + Blur + Wipe)** | Physical separation from device, device left unattended | All |
| **Settings Password** | Unauthorized changes to security settings | Journalists, Activists |
| **PIN Vault** | Quick access with limited exposure (separate from master password) | All |
| **Unique Key Per File/Folder** | Cross-file decryption if one key is compromised | All |
| **Encrypted Metadata** | Hides file names, tags, artists from localStorage inspection | Journalists, Activists |
| **Encrypted Backup Key** | Backup file cannot be decrypted without separate 26-char key | All |
| **Recovery Codes (10x, single-use)** | Master password loss without data loss | All |
| **No Server / Zero Telemetry** | No cloud account to compromise, no API to attack, no metadata to subpoena | All |
| **Argon2id (128MB, 19 iterations)** | GPU/ASIC brute-force resistance | All |
| **Encrypt-then-MAC (AES-CTR)** | Chosen-ciphertext attacks, bit-flipping attacks | All |
| **Streaming Encryption (4MB chunks)** | Large file handling without memory exhaustion | All |

---

## 3. Security Architecture Decisions

### Why Argon2id for Master Password?
- **Winner**: Password Hashing Competition (2015), recommended by OWASP
- **Memory-hard**: Uses 128MB RAM — drastically slows down GPU/ASIC brute-force (which have limited memory bandwidth)
- **Tuning**: 19 iterations, 4 threads (balance between security and speed on mobile devices)
- **Implementation**: `hash-wasm` (WASM bindings for Argon2id), not `libsodium` (which doesn't have Argon2id natively in WASM)
- **Why 128MB?**: Consumer GPUs have 4-12GB VRAM. Each Argon2id attempt requires 128MB. This limits parallel attempts to ~30-90 on consumer hardware, vs millions for SHA-256

### Why AES-GCM?
- **Authenticated**: Provides both confidentiality AND integrity (GCM tag of 128 bits)
- **Industry Standard**: Recommended by NIST, used by banks and governments worldwide
- **Native in Browser**: Web Crypto API supports AES-GCM natively (hardware acceleration on most devices)
- **256-bit key**: Resistant to quantum attacks (Grover's algorithm reduces effective strength to 128-bit — still secure for foreseeable future)

### Why Vault Key Only in Memory?
- **Principle**: If it's not on disk, it can't be read from disk
- **Storage**: `cryptoService.vaultKey` is a `CryptoKey` object (or `null`). Set in `crypto.ts:36-55` on unlock, cleared in `crypto.ts:62` on lock
- **localStorage**: We don't store the key here
- **IndexedDB**: We don't store keys here because IndexedDB is accessible via JS (XSS)
- **Forensic Resistance**: A locked device cannot provide the vault key — forensic tools like Cellebrite cannot extract what isn't stored

### Why Recovery Codes Are NOT Vault-Key-Dependent
- **Past issue (fixed v2.5.0-beta)**: Recovery codes were previously encrypted with the vault key, creating a catch-22 — users who forgot their master password couldn't access recovery codes
- **Current design**: Recovery codes are stored as plaintext JSON array in localStorage. They do not depend on the vault key or master password. This means:
  - A user who forgets their master password CAN use recovery codes to reset it
  - Recovery codes are single-use (consumed after use)
  - On first use, the user is prompted to write down or print the codes
- **Trade-off**: An attacker with localStorage access can read recovery codes. Mitigation: codes are single-use; after consumption they're removed. The master password + vault key protect the actual encrypted data.

### Cryptographic Isolation (Defense in Depth)
- **`cryptoPrimitives.ts`**: Each algorithm is isolated in its own module. No dependencies between them (avoids domino effects). Pure functions — no shared state
- **`streamCrypto.ts`**: Streaming is separate from standard encryption. Uses HMAC-SHA256 per-chunk IV derivation, not Vault Key directly
- **`backupCrypto.ts`**: Backup key is derived independently (Argon2id) with separate 26-char passphrase — doesn't use Vault Key
- **`metadataCrypto.ts`**: Encrypts metadata (name, tags, artist, album, cover URL, custom icon, external URL) separately from file content
- **`security.ts`**: PIN hashing uses PBKDF2-SHA256 (100K iterations) with random salt, timing-safe comparison
- **Why this matters for audit**: ~1,158 lines across 7 files can be audited in ~6 hours by a professional firm (Cure53, Radically Open Security, Include Security). Monolithic crypto implementations typically require 40+ hours

### Why 6 Algorithms?
- **Defense in diversity**: Not all algorithms age equally. If a weakness is found in AES-GCM, CrytoTool offers ChaCha20-Poly1305, XChaCha20-Poly1305, AES-CTR+HMAC, and Salsa20-Poly1305 as alternatives
- **Performance per platform**: AES has hardware acceleration on x86 (AES-NI). ChaCha20 is faster on mobile (ARM). Users can choose based on their device
- **Standardized**: All algorithms are NIST-approved or IETF standards (RFC 8439, RFC 8452, NIST SP 800-38D)
- Not vulnerable to a single algorithm being broken

---

## 4. Attack Surface

### What is Exposed to Attackers:

| Component | What it Exposes | Risk Level |
|-----------|------------------|------------|
| **localStorage** | `crytotool_salt`, `crytotool_iv`, `crytotool_vault_blob`, `crytotool_recovery_codes` (plaintext array), `crytotool_vault_pin_hash` (encrypted), `crytotool_vault_cats`, `crytotool_theme_config` | Medium (no vault key = no decryption) |
| **IndexedDB** | Encrypted files, metadata (name, size, date) — AES-256-GCM encrypted | Low (encrypted) |
| **Web Crypto API** | `CryptoKey` objects in memory | Low (browser sandbox protection) |
| **URL/History** | We don't store sensitive params in URL | Minimal |
| **Service Workers** | Not used | N/A |
| **Iframes** | Not used | N/A |

### What is NOT Exposed:
- Master Password (only Argon2id hash in memory temporarily during unlock)
- Vault Key (only in memory, cleared on lock; not in localStorage, not in IndexedDB)
- File Contents (AES-256-GCM encrypted, zero-server, zero-cloud)
- Decrypted Metadata (only decrypted on-demand for display)

---

## 5. Incident Response

### Progressive Lockout (`utils/security.ts:23-29`)
- **Trigger**: 3+ failed unlock attempts (Master Password or PIN)
- **Action**:
  - 3 failures → 30 second lock
  - 4 failures → 1 minute lock
  - 5+ failures → 5 minute lock
- **Implementation**: `getBackoffTime(failedAttempts)` returns time in seconds
- **Forensic defense**: Limits brute-force attempts. A device seized at a border and subjected to automated unlocking tools will hit lockout limits quickly

### Self-Destruct (`App.tsx`)
- **Configuration**: `autoDestructEnabled`, `autoDestructAttempts`, `autoDestructInactivity`
- **Trigger 1 (Failed Attempts)**: If `failedAttempts >= autoDestructAttempts` and `autoDestructEnabled === true` → complete wipe of IndexedDB + localStorage
- **Trigger 2 (Inactivity)**: If `elapsed >= autoDestructInactivity` seconds → countdown `destructCountdownSeconds` (default 30s) → complete wipe
- **Grace Period**: Before deletion, a visual countdown runs. A person can cancel if they enter the correct password in time
- **2026 relevance**: Forensic tools (Cellebrite UFED, Oxygen Forensics) can extract device data in minutes. Self-Destruct with low attempt threshold can wipe before extraction completes. For high-risk users: set `autoDestructAttempts: 1` so a single wrong password triggers wipe

### Dead Man Switch (`App.tsx`)
- **Function**: Monitors person's activity (`mousedown`, `mousemove`, `keydown`, `touchstart`, `scroll`)
- **Timer Reset**: Any activity resets `lastActivityRef.current`
- **Progressive Actions**:
  1. `elapsed >= autoBlurSeconds` → blur screen (isBlurred = true)
  2. `elapsed >= autoLockSeconds` → lock vault (isAuthenticated = false)
  3. `elapsed >= autoDestructInactivity` → trigger Self-Destruct
- **Use case**: Journalist detained at protest; device left behind. After configured inactivity, the vault locks, then wipes itself

---

## 6. Audit Guidelines

### How to Audit CrytoTool Code for Security:

All crypto files are in `utils/`. Total: ~1,028 lines across 7 files. Estimated professional audit time: **~6 hours** (industry minimum).

#### `utils/crypto.ts` (265 lines — Master Key Derivation + Encryption)
- ✅ Check: Argon2id params (memory: 131072, iterations: 19, parallelism: 4)
- ✅ Check: `vaultKey` is set/cleared correctly (not remaining in memory after lock)
- ✅ Check: `encryptString()` / `decryptString()` use AES-GCM with randomly generated IV
- ✅ Check: `vaultKey` is private — not accessible via XSS
- ✅ Check: `generateVaultKey()` uses AES-256-GCM (128-bit strength)
- ✅ Check: key is exportable (raw) for backup — `non-extractable` would prevent recovery

#### `utils/cryptoPrimitives.ts` (192 lines — Isolated Algorithms)
- ✅ Check: Each algorithm is isolated (no shared state, pure functions)
- ✅ Check: `aesCtr` uses HKDF-SHA256 for key derivation (encryption + MAC keys) — Encrypt-then-MAC
- ✅ Check: `aesCtr` MAC verification uses constant-time comparison (`diff |= ...`)
- ✅ Check: `chacha20Poly1305` / `xchacha20Poly1305` use libsodium (WASM) — intensively audited C library
- ✅ Check: IV lengths are correct per algorithm (12 for AES-GCM/ChaCha20, 16 for AES-CTR, 24 for XChaCha20/Salsa20)
- ⚠️ Note: `aesGcm` imports `CryptoKey` on each call (performance trade-off for isolation)

#### `utils/streamCrypto.ts` (219 lines — Streaming Encryption)
- ✅ Check: HMAC-SHA256 per-chunk IV derivation (each chunk IV is cryptographically unique)
- ✅ Check: Header parsing with magic bytes (prevents non-stream files from being decrypted as stream)
- ✅ Check: Argon2id key derivation with same params as vault
- ✅ Check: Chunk size (4MB) prevents memory exhaustion
- ⚠️ Note: Header is not authenticated. Each chunk has GCM tag. Tampering causes decryption failure, not key recovery.

#### `utils/backupCrypto.ts` (145 lines — Backup Encryption)
- ✅ Check: Argon2id with same parameters as vault
- ✅ Check: Random salt (16 bytes) generated for each backup
- ✅ Check: Format `[salt(16)][iv(12)][ciphertext+GCM tag]` is correct
- ✅ Check: Backup keys generated with 130-bit entropy (26 chars × 5 bits) using rejection sampling (no modulo bias)
- ✅ Check: Minimum file length validation on decrypt (16 + 12 + 16 = 44 bytes minimum)

#### `utils/metadataCrypto.ts` (71 lines — Metadata Encryption)
- ✅ Check: Uses `cryptoService.encryptString()` / `decryptString()` (AES-GCM)
- ✅ Check: `hasEncryptedMeta()` type guard — safe runtime check
- ✅ Check: `stripFromItem()` removes all sensitive metadata fields
- ⚠️ Note: Metadata is encrypted with vault key — metadata is inaccessible when vault is locked

#### `utils/security.ts` (136 lines — PIN + Lockout)
- ✅ Check: PIN hash uses PBKDF2-SHA256 (100K iterations) with random salt
- ✅ Check: `verifyPin()` uses timing-safe comparison (`diff |= ...`) — prevenitons timing side-channel attacks
- ✅ Check: PIN validation (6 digits, no common patterns, no sequences)
- ✅ Check: Progressive lockout with increasing backoff times
- ✅ Check: Blacklisted common PINs

#### `utils/vaultStorage.ts` (130 lines — Vault Key Storage)
- ✅ Check: `saveAll()` encrypts JSON with `cryptoService.encryptString()`
- ✅ Check: `getAll()` decrypts before returning
- ✅ Check: Legacy format (plaintext) is migrated correctly on first save

#### `App.tsx` (497 lines — State Management + Incident Response)
- ✅ Check: `destructTriggerTime` is saved in localStorage (persists between reloads)
- ✅ Check: `lastActivityRef` is updated on every activity event
- ✅ Check: Recovery codes loaded regardless of authentication state (fixed catch-22)
- ✅ Check: All sensitive states (`settingsPassword`, `vaultPin`) are in `useState`, not global variables

---

## 7. Dependencies Security

### `hash-wasm` (Argon2id implementation)
- **Purpose**: Argon2id key derivation for master password, backup passphrase, streaming key
- **CVE Status**: No known CVEs
- **Risk**: WASM binary loaded in browser — if compromised, attacker controls key derivation
- **Mitigation**: Locally bundled (not CDN), `package-lock.json` pins version, `npm audit` monitors CVEs

### `libsodium-wrappers` (ChaCha20, XChaCha20, Salsa20, BLAKE2b)
- **Purpose**: Non-AES encryption algorithms (alternative to Web Crypto API)
- **CVE Status**: Libsodium is intensively audited, written in C, no recent CVEs
- **Risk**: WASM wrapper ~31KB — small attack surface
- **Mitigation**: Same as hash-wasm (local, pinned, monitored)

### `framer-motion` (Animations)
- **Purpose**: UI transitions, drag gestures
- **Risk**: Large library ~100KB+ — potential XSS if used incorrectly
- **Mitigation**: We only use `motion.div`, `AnimatePresence` — no advanced functions

### `lucide-react` (Icons)
- **Purpose**: SVG icons
- **Risk**: Minimal (just SVG components)
- **Mitigation**: Standard icons only, no user-customized SVGs

---

## 8. Checklist for Security Review (Pre-Release)

Before releasing a new version, verify:

- [ ] `npm audit` — zero high/critical vulnerabilities
- [ ] Argon2id params unchanged (memory: 131072, iterations: 19, parallelism: 4)
- [ ] AES-GCM IV is randomly generated for each encryption (12 bytes)
- [ ] Vault Key is cleared from memory on lock (`cryptoService.clearKeys()`)
- [ ] `vaultStorage` saves keys encrypted (check localStorage for `crytotool_vault_keys`)
- [ ] PIN hash in localStorage is encrypted (check `crytotool_vault_pin_hash`)
- [ ] Recovery codes are stored as plaintext array (no vault key dependency)
- [ ] Recovery codes display correctly and can be used to reset password
- [ ] Progressive Lockout works (test 3+ failed attempts)
- [ ] Self-Destruct can be triggered manually and automatically
- [ ] Dead Man Switch locks and blurs after configured inactivity
- [ ] No "users" term in UI (use "people" / "persoane")
- [ ] CSP is present in Tauri config and/or `<meta>` tag
- [ ] All 6 algorithms encrypt and decrypt correctly

---

## External Resources
- **OWASP Top 10 Client-Side Security Risks**: https://owasp.org/www-project-top-10-client-side-security-risks/
- **Web Crypto API Security**: https://www.w3.org/TR/WebCryptoAPI/
- **Argon2 Specification**: https://github.com/P-H-C/phc-winner-argon2
- **EFF Surveillance Self-Defense**: https://ssd.eff.org/
- **Citizen Lab (Spyware Research)**: https://citizenlab.ca/
- **Journalist Security Guide (2026)**: https://saferjourno.org/
- **IndexedDB Security Research**: https://dfrws.org/wp-content/uploads/2024/07/Decrypting-IndexedDB-in-private-mode-o_2024_Forensic-Science-International-.pdf

---

## Reporting Security Issues
If you discover a vulnerability, report it through [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) or open an Issue. We respect the people who help us become more secure.
