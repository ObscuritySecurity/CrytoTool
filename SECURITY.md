# CrytoTool Security Documentation
_Version: 2.5.0-PRO | Last Updated: 2026-05-01_

## Filozofia de Securitate
**CrytoTool respectă oamenii din spatele ecranelor.** Securitatea nu e doar despre cod — e despre protejarea vieții digitale a persoanelor care ne folosesc aplicația.

---

## 1. Threat Model

### Ce protejăm împotriva atacurilor (Attack Surface Covered)

| Atac | Cum protejăm | Status |
|------|----------------|--------|
| **Brute-force pe Master Password** | Argon2id (64MB memory, 10 iterații, 4 thread-uri) — încetinește drastic brute-force-ul | ✅ Protejat |
| **Acces fizic la dispozitiv** | Vault Key doar în memorie (RAM), șters la lock; IndexedDB criptat cu AES-GCM | ✅ Protejat |
| **Acces la browser localStorage** | Cheile manuale de criptare sunt acum criptate cu Vault Key (AES-256-GCM) înainte de stocare | ✅ Protejat (din 0201163) |
| **Coliziune de algoritm** | Folosim algoritmi standard: AES-256-GCM, Argon2id, PBKDF2-SHA256, ChaCha20-Poly1305 | ✅ Protejat |
| **Acces multi-persoane pe același dispozitiv** | Auto-lock după inactivitate, Progressive Lockout, opțiune Self-Destruct | ✅ Protejat |
| **Pierderea parolei** | 10 coduri recovery unice, reset token prin email | ✅ Protejat |
| **Atacuri de tip "supply chain" (deps pe biblioteci compromise)** | `npm audit` regulat, biblioteci minime (`hash-wasm`, `libsodium-wrappers`) | ⚠️ Monitorizat |

### Atacuri recente (2025-2026) — Ce am învățat

#### 1. Stored XSS → Exfiltrare localStorage (CVE-2026-33193, GHSA-j8vv-9f8m-r7jx)
- **Ce s-a întâmplat**: Docmost (2026) — un atacator poate încărca un fișier cu MIME type falsificat (ex: `text/html` în loc de `application/pdf`). Când victima deschide previzualizarea, scriptul se execută în origin-ul aplicației și poate citi **toate cheile din localStorage**.
- **Cum ne protejăm**: CrytoTool nu are previzualizare de fișiere; toate fișierele sunt criptate și stocate în IndexedDB; cheile manuale sunt criptate cu Vault Key.
- **Risc rămas**: Dacă există o vulnerabilitate XSS în codul nostru, atacatorul poate apela `cryptoService.vaultKey` direct din consolă (deoarece cheia e în memoria JS).

#### 2. Stored XSS → Account Takeover via localStorage credentials (CVE-2026-27822, RustFS)
- **Ce s-a întâmplat**: Consola de administrare RustFS stoca `AccessKey`, `SecretKey`, `SessionToken` în localStorage. Un XSS a permis citirea lor și preluarea completă a contului.
- **Cum ne protejăm**: Nu stocăm token-uri de sesiune pe server; totul e client-side. Nu avem "conturi" în sensul clasic — avem doar un vault local.
- **Risc rămas**: PIN hash-ul (`crytotool_vault_pin_hash`) e în localStorage ca string. Dacă atacatorul are XSS, poate face brute-force pe hash.

#### 3. Ed25519 Private Key în localStorage (CVE-type, OpenClaw 2026)
- **Ce s-a întâmplat**: O aplicație Web a stocat cheia privată Ed25519 în localStorage ca plaintext. XSS-ul a putut extrage cheia și a falsifica semnături.
- **Cum ne protejăm**: Vault Key nu e stocată nicăieri (doar în memorie). Cheile manuale sunt criptate înainte de localStorage. Folosim Web Crypto API (`CryptoKey` objects) ori de câte ori e posibil.
- **Recomandare pentru viitor**: Migrare către `non-extractable CryptoKey` stocate în IndexedDB (nu localStorage) pentru cheile Vault.

#### 4. IndexedDB Cross-Origin Leaks (Safari 15, Firefox Private Mode)
- **Ce s-a întâmplat**: Safari 15 a avut o bug unde numele bazelor de date IndexedDB se scurgeau între origini diferite (tracking). Firefox în Private Mode stochează IndexedDB criptat pe disc (din 2023), dar cheia de criptare e în memorie și poate fi extrasă (conform cercetării Dohun Kim, 2024).
- **Cum ne protejăm**: CrytoTool folosește IndexedDB doar pentru datele vault-ului (same-origin). Nu facem tracking. Cheia de criptare a Vault-ului e în memorie, nu pe disc.
- **Risc rămas**: În Firefox Private Mode, dacă PC-ul e confiscat cu memoria RAM capture-d (frozen/hibernated), IndexedDB poate fi decriptat de pe disc.

#### 5. SSR XSS în Svelte (CVE-2025-15265)
- **Ce s-a întâmplat**: Svelte 5.46.0-5.46.3 a avut o vulnerabilitate unde `hydratable(key, fn)` injecta `key` fără escaping HTML în `` block. Atacatorul putea încheia `` și executa JS.
- **Cum ne protejăm**: CrytoTool folosește React + Vite, nu Svelte. Nu avem server-side rendering (SSR) — totul e client-side.
- **Notă**: Dacă vom adăuga SSR în viitor, trebuie să fim extrem de atenți la serializarea datelor în tag-uri `` .

### Ce NU protejăm (Extreme Cases — Riscuri Rămase)

| Scenariu | De ce nu protejăm | Mitigație posibilă |
|-----------|---------------------|----------------------|
| **XSS complet în aplicație** | Dacă atacatorul poate executa JS, are acces la `cryptoService.vaultKey` (obiect în memorie) | Content Security Policy (CSP) — încă neimplementat |
| **Malicious browser extension** | Extensiile au acces la localStorage și pot injecta scripturi | Nu avem control; utilizatorul trebuie să instaleze doar extensii de încredere |
| **Physical RAM dumping** | Dacă atacatorul poate citi memoria procesului browser, poate extrage Vault Key | Folosire `non-extractable CryptoKey` în viitor |
| **Supply chain attack pe `npm`** | O bibliotecă compromisă poate exfiltra date prin `postMessage` sau `fetch` | `npm audit`, limitarea dependențelor, monitorizare CVE |
| **Zero-day în Web Crypto API** | Dacă browser-ul e compromis, criptarea e spartă | Nu avem control; actualizări browser |
| **Social engineering** | O persoană poate fi păcălită să-și dezvăluie parola | Educație, interfață clară |

---

## 2. Security Architecture Decisions

### De ce Argon2id pentru Master Password?
- **Standard**: Câștigătorul Password Hashing Competition (2015), recomandat de OWASP.
- **Memory-hard**: Folosește 64MB RAM — încetinește drastic brute-force-ul pe GPU-uri (care au memorie limitată).
- **Tuning**: 10 iterații (echilibrat între securitate și viteză pe dispozitive mobile).
- **Implementare**: `hash-wasm` (wasm-bindings pentru Argon2id), nu `libsodium` (care nu are Argon2id nativ în WASM).

### De ce AES-GCM?
- **Autentificat**: Oferă atât confidențialitate cât și integritate (GCM tag de 128 biți).
- **Standard industrie**: Recomandat de NIST, folosit de guverne și bănci.
- **Nativ în browser**: Web Crypto API suportă AES-GCM nativ (hardware acceleration pe majoritatea dispozitivelor).
- **256 biți**: Rezistență la atacurile cuantice (dacă vor apărea).

### De ce Vault Key doar în memorie?
- **Principiu**: Dacă nu e pe disc, nu poate fi citit de pe disc.
- **Stocare**: `cryptoService.vaultKey` e un `CryptoKey` object (sau `null`). E setat în `crypto.ts:36-55` la unlock și șters în `crypto.ts:62` la lock.
- **localStorage**: Nu stocăm cheia aici, deși am putea stoca un `non-extractable CryptoKey` — am ales să nu o facem pentru a evita accesul prin XSS.
- **IndexedDB**: Nu stocăm cheia aici deoarece IndexedDB e accesibil prin JS (XSS).

### Izolarea Criptografică (Defense in Depth)
- **`cryptoPrimitives.ts`**: Fiecare algoritm e izolat într-un modul separat. Nu au dependențe între ele (evită efectele de domino).
- **`streamCrypto.ts`**: Streaming-ul e separat de criptarea standard. Folosește BLAKE2b (libsodium) pentru derivarea cheii, nu Vault Key direct.
- **`backupCrypto.ts`**: Cheia de backup e derivată independent (PBKDF2-SHA256, 100k iterații) — nu folosește Vault Key.
- **`vaultStorage.ts` (actualizat)**: Cheile manuale sunt criptate cu Vault Key înainte de localStorage. Dacă Vault Key e șters (lock), cheile din localStorage devin ilegibile.

---

## 3. Known Vulnerabilities (Riscuri Rămase)

### 3.1. PIN Hash în localStorage (`crytotool_vault_pin_hash`)
- **Problema**: Hash-ul PIN-ului e stocat ca string simplu în localStorage. Dacă un atacator are acces la localStorage (XSS sau acces fizic), poate încerca brute-force pe hash.
- **Mitigație actuală**: Hash-ul e SHA-256 (nu e rapid ca MD5), dar fără salt unic per încercare. Nu avem rate-limiting pe încercările de verificare a PIN-ului.
- **Soluție recomandată**: Stocarea PIN-ului ca `non-extractable CryptoKey` în IndexedDB, sau criptarea hash-ului cu Vault Key (la fel ca `vaultStorage`).

### 3.2. Recovery Codes în localStorage (`crytotool_recovery_codes`)
- **Problema**: Cele 10 coduri de recovery sunt stocate ca JSON plaintext în localStorage. Dacă un atacator le obține, poate debloca vault-ul fără parolă.
- **Soluție recomandată**: Criptarea lor cu Vault Key (ca la `vaultStorage`).

### 3.3. Lipsa Content Security Policy (CSP)
- **Problema**: Nu avem un header `Content-Security-Policy`. Dacă există o vulnerabilitate XSS, atacatorul poate executa orice script.
- **Soluție recomandată**: Adăugarea CSP header în `vite.config.ts` (sau prin service worker) pentru a interzice `unsafe-inline` și `unsafe-eval`.

### 3.4. Accesul la `cryptoService.vaultKey` prin XSS
- **Problema**: Dacă un atacator poate executa JS (XSS), poate apela:
  ```javascript
  // În consola browser-ului sau prin XSS
  const key = window.cryptoService.vaultKey; // Acces la Vault Key
  ```
- **Soluție recomandată**: Folosirea `CryptoKey` cu `extractable: false` și păstrarea lui într-un `WeakMap` sau `Closure` unde nu e accesibil din exterior. Actualmente `vaultKey` e o proprietate publică a `EncryptionService`.

### 3.5. Librării terțe (`framer-motion`, `lucide-react`)
- **Problema**: `framer-motion` și `lucide-react` sunt biblioci mari (potențial surface de atac). Nu le audităm manual.
- **Soluție recomandată**: Monitorizare CVE pentru aceste pachete, limitarea funcționalităților lor (dezactivat animațiile dacă nu sunt necesare).

---

## 4. Attack Surface

### Ce e expus către atacatori:

| Componentă | Ce expune | Riscul |
|------------|----------|--------|
| **localStorage** | `crytotool_salt`, `crytotool_iv`, `crytotool_vault_pin_hash`, `crytotool_recovery_codes`, `crytotool_vault_cats`, `crytotool_theme_config` | Acces prin XSS, citire de pe disc |
| **IndexedDB** | Fișiere criptate, metadata (nume, dimensiune, dată) | Acces prin XSS (dacă Vault Key e disponibil) |
| **Web Crypto API** | `CryptoKey` objects în memorie | Extragere din RAM (protejat doar de browser's sandbox) |
| **URL/History** | Nu stocăm parametri sensibili în URL | Risc minim (SPA fără server) |
| **Service Workers** | Nu folosim încă | N/A |
| **Iframes** | Nu folosim | N/A |

### Ce NU e expus:
- Parola Master (doar Argon2id hash în memorie temporar)
- Vault Key (doar în memorie, șters la lock)
- Cheile manuale (criptate în localStorage, criptate cu Vault Key)

---

## 5. Incident Response

### Progressive Lockout (`utils/security.ts:23-29`)
- **Trigger**: 3+ încercări eșuate de unlock (Master Password sau PIN)
- **Acțiune**:
  - 3 eșecuri → blocare 30 secunde
  - 4 eșecuri → blocare 1 minut
  - 5+ eșecuri → blocare 5 minute
- **Implementare**: `getBackoffTime(failedAttempts)` returnează timpul de așteptare în secunde.

### Self-Destruct (`App.tsx:78-108`)
- **Configurare**: `autoDestructEnabled`, `autoDestructAttempts`, `autoDestructInactivity`
- **Trigger 1 (Failed Attempts)**: Dacă `failedAttempts >= autoDestructAttempts` și `autoDestructEnabled === true` → ștergere completă IndexedDB + localStorage.
- **Trigger 2 (Inactivity)**: Dacă trece `autoDestructInactivity` secunde de inactivitate și `autoDestructEnabled === true` → countdown `destructCountdownSeconds` (default 30s) → ștergere completă.
- **Grace Period**: Înainte de ștergere, rulează un countdown vizual. O persoană poate anula dacă introduce parola la timp.

### Dead Man Switch (`App.tsx:110-145`)
- **Funcționare**: Monitorizează activitatea utilizatorului (`mousedown`, `mousemove`, `keydown`, `touchstart`, `scroll`).
- **Resetare timer**: Orice activitate resetează `lastActivityRef.current`.
- **Acțiuni progressive**:
  1. `elapsed >= autoBlurSeconds` → blur ecran (isBlurred = true)
  2. `elapsed >= autoLockSeconds` → lock vault (isAuthenticated = false)
  3. `elapsed >= autoDestructInactivity` → declanșează Self-Destruct

---

## 6. Audit Guidelines

### Cum să audiezi codul CrytoTool pentru securitate:

#### `utils/crypto.ts` (Master Key Derivation + Encryption)
- ✅ Verifică: Argon2id params (memory: 65536, iterations: 10, parallelism: 4)
- ✅ Verifică: `vaultKey` e setat/șters corect (nu rămâne în memorie după lock)
- ✅ Verifică: `encryptString()` / `decryptString()` folosesc AES-GCM cu iv generat random
- ⚠️ Atenție: `vaultKey` e proprietate publică — accesibil din exterior prin XSS

#### `utils/vaultStorage.ts` (Encrypted Vault Keys)
- ✅ Verifică: `saveAll()` criptează JSON-ul cu `cryptoService.encryptString()`
- ✅ Verifică: `getAll()` decriptează înainte de returnare
- ✅ Verifică: Legacy format (plaintext) e migrat corect la prima salvare
- ⚠️ Atenție: Dacă Vault Key nu e disponibil (vault locked), `getAll()` returnează `[]` (nu crash-ează, dar datele nu sunt accesibile)

#### `utils/backupCrypto.ts` (Backup Encryption)
- ✅ Verifică: PBKDF2-SHA256 cu 100,000 iterații
- ✅ Verifică: Salt generat random (16 bytes) la fiecare backup
- ✅ Verifică: Format `[salt][iv][ciphertext+GCM tag]` e respectat
- ⚠️ Atenție: Cheia de backup e generată de aplicație (26 chars) — utilizatorul trebuie să o salveze manual

#### `utils/security.ts` (PIN + Lockout)
- ✅ Verifică: PIN hash folosește SHA-256 cu salt fix (`crytotool_vault_pin_salt_v1`)
- ✅ Verifică: `verifyPin()` folosește comparație constant-time (`diff |= ...`)
- ⚠️ Atenție: `COMMON_PINS` e o listă limitată — utilizatorii pot alege PIN-uri slabe dacă nu folosesc interfața noastră

#### `utils/cryptoPrimitives.ts` (Isolated Algorithms)
- ✅ Verifică: Fiecare algoritm e izolat (nu partajează stare)
- ✅ Verifică: `aesCtr` folosește HKDF-like pentru derivarea cheii de MAC
- ✅ Verifică: `chacha20Poly1305` / `xchacha20Poly1305` folosesc libsodium (WASM) — auditat intens
- ⚠️ Atenție: `aesGcm` importă `CryptoKey` la fiecare apel (performance, dar sigur)

#### `App.tsx` (State Management + Incident Response)
- ✅ Verifică: `destructTriggerTime` e salvat în localStorage (persistă între reload-uri)
- ✅ Verifică: `lastActivityRef` e actualizat la fiecare eveniment de activitate
- ✅ Verifică: Toate stările sensibile (`settingsPassword`, `vaultPin`) sunt în `useState`, nu în variabile globale

---

## 7. Dependencies Security

### `hash-wasm` (Argon2id implementation)
- **Versiune**: Verifică `package.json`
- **CVE**: Nu există CVE-uri cunoscute pentru `hash-wasm`
- **Risk**: WASM binary e încărcat în browser — dacă CDN-ul e compromis (nu e cazul nostru, e local în `node_modules`), atacatorul poate injecta cod
- **Update**: `npm update hash-wasm`

### `libsodium-wrappers` (ChaCha20, XChaCha20, Salsa20, BLAKE2b)
- **Versiune**: Verifică `package.json`
- **CVE**: Nu există CVE-uri recente pentru libsodium (biblioteca e auditată intens, scrisă în C)
- **Risk**: WASM wrapper (31KB) — suprafață mică de atac
- **Update**: `npm update libsodium-wrappers`

### `framer-motion` (Animations)
- **Versiune**: Verifică `package.json`
- **CVE**: Monitorizează `npm audit` pentru CVE-uri XSS în animații
- **Risk**: Bibliotecă mare (100KB+), multe funcții — potențial XSS dacă nu e folosită corect
- **Mitigație**: Folosim doar componentele `motion.div`, `AnimatePresence` — nu funcții avansate

### `lucide-react` (Icons)
- **Versiune**: Verifică `package.json`
- **CVE**: Risc minim (doar SVG icons)
- **Risk**: Iconițele sunt componente React — dacă e injectat cod rău în SVG, poate cauza XSS
- **Mitigație**: Folosim iconițe standard, nu SVG-uri personalizate de utilizatori

---

## 8. Checklist pentru Security Review

Înainte de a lansa o versiune nouă, verifică:

- [ ] `npm audit` — zero vulnerabilități high/critical
- [ ] Argon2id params neschimbate (memory: 65536, iterations: 10)
- [ ] AES-GCM IV e generat random la fiecare criptare (12 bytes)
- [ ] Vault Key e șters din memorie la lock (`cryptoService.clearKeys()`)
- [ ] `vaultStorage` salvează cheile criptate (verifică localStorage pentru `crytotool_vault_keys` — trebuie să fie `{iv, data}`, nu plaintext)
- [ ] PIN hash în localStorage e SHA-256 (nu plaintext)
- [ ] Progressive Lockout funcționează (testează 3+ eșecuri)
- [ ] Self-Destruct poate fi declanșat manual și automat
- [ ] Recovery codes sunt afișate corect și funcționează
- [ ] Nu există "utilizatori" în UI (folosește "persoane")

---

## Resurse Externe
- **OWASP Top 10 Client-Side Security Risks**: https://owasp.org/www-project-top-10-client-side-security-risks/
- **Web Crypto API Security**: https://www.w3.org/TR/WebCryptoAPI/
- **Argon2 Specification**: https://github.com/P-H-C/phc-winner-argon2
- **IndexedDB Security (Firefox Private Mode Research)**: https://dfrws.org/wp-content/uploads/2024/07/Decrypting-IndexedDB-in-private-mode-o_2024_Forensic-Science-International-.pdf
- **CVE-2026-33193 (Docmost XSS)**: https://securitylab.github.com/advisories/GHSL-2026-052_docmost/
- **CVE-2025-15265 (Svelte SSR XSS)**: https://caverav.cl/posts/svelte-hydratable-xss/

---

**Contact pentru securitate**: Dacă găsești o vulnerabilitate, raportează prin [GitHub Security Advisories](https://github.com/ObscuritySecurity/CrytoTool/security/advisories) sau deschide un Issue. Respectăm oamenii care ne ajută să fim mai siguri.
