# CrytoTool Security Documentation
_Version: 2.5.0-beta | Last Updated: 2026-06-21_

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

> **CrytoTool's cryptographic code has NOT been professionally audited.** The encryption is implemented using standard algorithms (AES-256-GCM, Argon2id, ChaCha20-Poly1305, etc.) via a Rust crate compiled to WASM (`crypto-core/`) using audited crates (`aes-gcm`, `argon2`, `chacha20poly1305`, etc.). However, the integration code — how keys are derived, stored, and managed — has not been reviewed by third-party security researchers.
>
> **If you are in immediate physical danger, under active surveillance by a state actor, or facing detention with forensic device extraction, do not rely solely on CrytoTool for your safety.** Use it as one layer of protection, but understand that without a professional audit, there may be implementation flaws that a determined adversary could exploit.
>
> A professional audit is planned. Until then, CrytoTool is best suited for **defense against casual to moderate adversaries** — not nation-states or advanced forensic laboratories.

---

## Reporting Security Issues

Report vulnerabilities via **[GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories)**. We respond as fast as possible.

---

## Known Upstream Issues

### `glib` (RUSTSEC-2024-0429 / GHSA-wrw7-89jp-8q8g) — Linux Tauri runtime

| | |
| --- | --- |
| **Severity** | Medium (CVSS v4: 6.9, type: Unsound) |
| **Component** | `glib` Rust crate v0.18.5 (transitive via `tauri 2.11.2` → `gtk-rs 0.18.2`) |
| **Trigger** | Iterator / `DoubleEndedIterator` operations on `glib::VariantStrIter` |
| **Impact on CrytoTool** | Application crash under specific Linux desktop integration paths (D-Bus, GVariant string lists). **No data exfiltration, no remote code execution, no privilege escalation.** The vulnerable code path is not called from CrytoTool's own Rust source (which is intentionally minimal: a single unused `greet` command). |
| **Patched in** | `glib >= 0.20.0` |
| **Why not patched in CrytoTool** | `glib 0.20+` is part of the maintained `gtk-rs-core 0.22.x` line, which targets **GTK 4**. The rest of the GTK 3 chain (`gtk`, `gdk`, `atk` all at `0.18.2`) is **archived and unmaintained upstream** with no `0.20+` releases. `tauri 2.11.2` (latest at the time of writing) still pins the GTK 3 family. The official position from the Tauri team is `status: upstream` (see [`tauri-apps/tauri#12048`](https://github.com/tauri-apps/tauri/issues/12048), [`tauri-apps/tauri#15035`](https://github.com/tauri-apps/tauri/issues/15035)). Fedora has [retired the gtk3-rs and gtk-rs-core v0.18 packages](https://fedoraproject.org/wiki/Changes/Retire_gtk3-rs,_gtk-rs-core_v0.18,_and_gtk4-rs_v0.7) for the same reason. |
| **Mitigation timeline** | Awaiting Tauri migration to GTK 4 / `gtk-rs 0.20+`. The CrytoTool codebase itself cannot resolve this without forking and maintaining the GTK 3 Rust bindings — an unsustainable burden for a single application. |
| **Risk acceptance** | Documented and tracked via GitHub Dependabot alert #20. The vulnerability is in third-party desktop integration code, isolated from CrytoTool's cryptographic core (which runs in Rust/WASM — see `docs/ARCHITECTURE.md`). Dependabot is configured (`.github/dependabot.yml`) to ignore further updates to the affected gtk-rs 0.18 family so alerts stay focused on actionable items. |
