# CrytoTool Security Documentation
_Version: 2.5.0-beta | Last Updated: 2026-05-29_

---

## Who Is This For?

CrytoTool is built for **people**, not users. Specifically:

| Audience | Why They Need It |
|----------|------------------|
| **Ordinary People** | You want your photos, documents, and files private — from your phone carrier, cloud provider, or anyone who borrows your device. You don't need to be a technician. |
| **Journalists** | You need to protect sources, drafts, and research material. Your device could be searched at a border or seized. |
| **Activists** | Your phone contains contact lists, meeting notes, evidence. A locked device is not enough — encryption must be verifiable. |
| **Power Users** | You want multiple algorithms, streaming encryption, encrypted metadata, self-destruct, Dead Man Switch. Full control. |

CrytoTool asks for **30+ characters once** (Master Password setup), then only your **6-digit PIN** for daily access. The rest is optional — turn features on as you need them.

---

## Threat Model by Audience

### 🧑 Ordinary People

**Typical threats:**
- Someone looks at your phone while unlocked
- Cloud backup provider reads your files
- Phone lost or stolen (with lock screen bypass)
- Family member accesses your device

**How CrytoTool protects you:**
| Setting | What It Does | Default |
|---------|-------------|---------|
| Master Password (30+ chars) | Derives the encryption key. No password = no data. | Required |
| 6-digit PIN | Daily access to vault after initial unlock | Required |
| Auto-lock | Locks vault after inactivity (30s / 1min / 5min) | On (1 min) |
| Visual Obfuscation | Blurs content when vault is locked | On |
| AES-256-GCM | Default encryption for all stored files | On |
| Trash | Deleted files go to trash before permanent erase | On |

**What you should do:**
1. Choose a Master Password you can remember (30+ characters — a sentence works)
2. Pick a 6-digit PIN that's not your birth year or `123456`
3. Set Auto-lock to 1 minute
4. Done. Everything else is already turned on.

---

### 📰 Journalists

**Typical threats:**
- Border search / device seizure
- Targeted phishing or malware
- Physical coercion to unlock
- Subpoena to cloud provider (irrelevant — no cloud)

**How CrytoTool protects you:**
| Setting | What It Does | Default |
|---------|-------------|---------|
| Self-Destruct | Vault wipes after N failed PIN attempts | Off (you enable) |
| Progressive Lockout | Waiting time increases after 3rd wrong attempt | On |
| Dead Man Switch | Auto-lock + blur + destruct after prolonged inactivity | Off (you enable) |
| 10 Recovery Codes | Emergency access if you forget password | On (save them) |
| Encrypted Metadata | File names, tags, album names encrypted | On |
| No Network Requests | Zero data leaves your device (100% client-side) | By design |

**What you should do:**
1. All ordinary steps above
2. **Enable Self-Destruct** after a failed attempt count that fits your risk (e.g., 5 attempts)
3. **Enable Dead Man Switch** — if you don't interact with the app for 10+ minutes, vault locks, blurs, and optionally wipes
4. **Store recovery codes offline** (paper, separate location) — never digitally
5. Use a **unique Master Password** not used anywhere else
6. Consider using XChaCha20-Poly1305 for files that need strongest protection

---

### ✊ Activists

**Typical threats:**
- Device confiscation with forensic extraction (Cellebrite, GrayKey)
- Extended detention with device access
- Targeted surveillance
- Physical threats to compel unlock

**How CrytoTool protects you:**
| Setting | What It Does | Default |
|---------|-------------|---------|
| Argon2id (128MB, 19 iterations) | Makes brute-force infeasible even with GPU clusters | On |
| Vault Key in RAM only | On lock or timeout, key is destroyed | On |
| No biometric fallback | PIN-only — biometrics can be forced | Off (optional) |
| Encrypted Backup Key | Separate 26-char passphrase for backups | On |
| PIN Blacklist | Blocks most common 6-digit PINs | On |
| Timing-safe PIN check | Prevents side-channel attacks | On |

**⚠️ Important limitation — read this:**

> **CrytoTool's cryptographic code has NOT been professionally audited.** The encryption is implemented using standard algorithms (AES-256-GCM, Argon2id, ChaCha20-Poly1305, etc.) via Web Crypto API and audited libraries (`hash-wasm`, `libsodium-wrappers`). However, the integration code — how keys are derived, stored, and managed — has not been reviewed by third-party security researchers.
>
> **If you are in immediate physical danger, under active surveillance by a state actor, or facing detention with forensic device extraction, do not rely solely on CrytoTool for your safety.** Use it as one layer of protection, but understand that without a professional audit, there may be implementation flaws that a determined adversary could exploit.
>
> A professional audit is planned. Until then, CrytoTool is best suited for **defense against casual to moderate adversaries** — not nation-states or advanced forensic laboratories.

**Recommended settings:**
1. All journalist steps above
2. **Enable Self-Destruct at 3 failed attempts** (if 3 wrong PINs, vault erases)
3. **Maximum Progressive Lockout** — after 5 failed attempts, 5-minute delay
4. Do NOT store recovery codes digitally — memorize or store in separate physical location
5. Use **AES-GCM-Stream** for large files (4MB chunks prevent memory analysis)
6. Enable **Encrypted Backup** and store backup key separately

---

### 🖥️ Power Users

**Typical threats:**
- Same as above, plus advanced attack scenarios
- Algorithm obsolescence over time
- Need for verifiable security properties

**Extra controls available:**
| Setting | What It Does |
|---------|-------------|
| 6 encryption algorithms | AES-256-GCM, AES-CTR+HMAC, ChaCha20-Poly1305, XChaCha20-Poly1305, Salsa20-Poly1305, AES-GCM-Stream |
| Per-file algorithm choice | Each file encrypted with its own key and chosen algorithm |
| Encrypted metadata | File name, tags, artist, album, cover art URL — all encrypted |
| Custom icon per folder | No hints about folder contents |
| Storage overview | See file types without decrypting |
| 100 themes + 40+ fonts | Obfuscate UI — no visual cues about app purpose |

For implementation details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Known Limitations

| Limitation | Impact | Timeline |
|------------|--------|----------|
| **No professional audit** | Crypto integration not reviewed by third party | Planned — no date set |
| **Tauri CSP set to `null`** | No Content Security Policy in desktop builds | Fix planned |
| **Recovery codes encrypted with vault key** | Cannot access recovery codes without Master Password (circular dependency) | Requires architectural change |
| **File IDs use `Date.now()`** | Possible collision with rapid uploads | Low priority |
| **No automated tests** | Regression risk during updates | Planned |
| **English-only source strings** | All 51 languages translated, but English is authoritative | By design |

## Reporting Security Issues

Report vulnerabilities via **[GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories)**

Only the project architect and approved external security auditors handle cryptographic code. Vulnerability reports are confidential and responded to within 72 hours.
