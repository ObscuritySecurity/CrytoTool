# CrytoTool Security Documentation
_Version: 2.5.0-beta | Last Updated: 2026-05-28_

## Threat Model

| Attack | How We Protect | Status |
|--------|----------------|--------|
| **Master Password Brute-force** | Argon2id (128MB memory, 19 iterations, 4 threads) | ✅ Protected |
| **Physical Device Access** | Vault Key only in RAM, cleared on lock; IndexedDB AES-GCM encrypted | ✅ Protected |
| **localStorage Extraction** | Keys encrypted with Vault Key (AES-256-GCM) before storage | ✅ Protected |
| **Data at Rest Interception** | All file data AES-256-GCM; metadata encrypted separately | ✅ Protected |
| **Algorithm Collision** | 6 standard algorithms supported | ✅ Protected |
| **Shared Device Access** | Auto-lock, Progressive Lockout, Self-Destruct | ✅ Protected |
| **Password Loss** | 10 recovery codes (8-char, ~40 bits entropy each), encrypted | ✅ Protected |
| **Supply Chain** | `npm audit`, dependency overrides for transitive CVEs | ⚠️ Monitored |

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed cryptographic parameters, key lifecycle, and implementation details.

## Reporting Security Issues

Report vulnerabilities via **[GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories)** (preferred) or open a standard issue. For cryptographic flaws, contact the project architect directly. We respect everyone who helps keep people's data safe.
