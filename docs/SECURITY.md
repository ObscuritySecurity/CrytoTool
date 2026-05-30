# CrytoTool Security Documentation
_Version: 2.5.0-PRO | Last Updated: 2026-05-30_

---

## Threat Model by Audience

### Ordinary People / Privacy-Conscious Civilians

| Aspect | Detail |
|--------|--------|
| **Adversary** | Data brokers, ad tech, low-level fraud, phishing, credential stuffing, casual device access (family/roommates) |
| **Assets** | Personal photos, documents, financial records |
| **Consequences** | Identity theft, financial loss, doxxing |
| **Recommended Features** | Master Password, Auto-Lock, Visual Obfuscation, PIN Vault, Unique Key Per File |

### Journalists & Media Workers

| Aspect | Detail |
|--------|--------|
| **Adversary** | State agencies, corporate security, spyware operators (Pegasus, Graphite, Predator), border agents with forensic tools (Cellebrite) |
| **Assets** | Source identities, unpublished investigations, confidential documents |
| **Consequences** | Source imprisonment, physical harm, legal retaliation |
| **Recommended Features** | Self-Destruct, Progressive Lockout, Dead Man Switch, Encrypted Backup Key, Settings Password |

### Activists (Authoritarian Regimes)

| Aspect | Detail |
|--------|--------|
| **Adversary** | State security services, informants, state-sponsored hackers, censorship authorities |
| **Assets** | Physical location, associate identities, protest coordination, evidence of abuse |
| **Consequences** | Arrest, torture, disappearance |
| **Recommended Features** | Self-Destruct, Dead Man Switch, Progressive Lockout, PIN Vault, Settings Password |

### Whistleblowers

| Aspect | Detail |
|--------|--------|
| **Adversary** | Employer, corporate security, government agencies, forensic investigators |
| **Assets** | Evidence documents, internal communications, identity |
| **Consequences** | Termination, legal prosecution, blacklisting |
| **Recommended Features** | Self-Destruct, Backup Encryption, Encrypted Metadata |

---

## Feature Mapping

| Feature | What It Protects Against | For Whom |
|---------|--------------------------|----------|
| **Master Password (30+ characters)** | Brute-force, credential stuffing, shoulder surfing | Everyone |
| **Progressive Lockout** | Automated guessing, physical access brute-force | Everyone |
| **Settings Password** | Unauthorized changes to security settings if device is accessed | Journalists, Activists |
| **Self-Destruct** | Device seizure, forensic extraction, coercion | Journalists, Activists, Whistleblowers |
| **Auto-Lock & Visual Obfuscation** | Device left unattended, casual access, shoulder surfing | Everyone |
| **Unique Key Per File/Folder** | Cross-file decryption if one key is compromised | Everyone |
| **PIN Blacklist** | Weak PINs (123456, 000000, etc.) | Everyone |
| **Encrypted Backup Key** | Backup file cannot be decrypted without separate 26-char key | Everyone |
| **Dead Man Switch** | Prolonged separation from device — auto-lock then wipe | Journalists, Activists |
| **Recovery Codes (10x, single-use)** | Master password loss without data loss | Everyone |

---

## Important Limitation

> **CrytoTool's cryptographic code has NOT been professionally audited.** The encryption is implemented using standard algorithms (AES-256-GCM, Argon2id, ChaCha20-Poly1305, etc.) via Web Crypto API and audited libraries (`hash-wasm`, `libsodium-wrappers`). However, the integration code — how keys are derived, stored, and managed — has not been reviewed by third-party security researchers.
>
> **If you are in immediate physical danger, under active surveillance by a state actor, or facing detention with forensic device extraction, do not rely solely on CrytoTool for your safety.** Use it as one layer of protection, but understand that without a professional audit, there may be implementation flaws that a determined adversary could exploit.
>
> A professional audit is planned. Until then, CrytoTool is best suited for **defense against casual to moderate adversaries** — not nation-states or advanced forensic laboratories.

---

## Reporting Security Issues

Report vulnerabilities via **[GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories)**. We respond as fast as possible.
