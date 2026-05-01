CrytoTool respects the people behind the screen. It's a four-in-one, client-side encryption file manager, gallery, music player, and document viewer where your privacy comes first: no tracking, no ads, no data collection.

CrytoTool is compliant with the protocol and respects all the principles included in it: [protocol-3305](https://github.com/ObscuritySecurity/protocol-3305)

### Architecture Overview

CrytoTool uses a 100% client-side architecture with 4 layers of encryption:

| Layer | What it does | Key detail |
|-------|----------------|------------|
| **1. Database Encryption** | Auto-encrypts every file in IndexedDB | AES-256-GCM, keys from Master Password via Argon2id |
| **2. File & Folder Encryption** | Manual encryption with 6 algorithms | AES-GCM, XChaCha20-Poly1305, ChaCha20-Poly1305, AES-CTR, Salsa20-Poly1305, AES-GCM-Stream |
| **3. Encrypted Backup** | Creates secure backups of all data | PBKDF2-SHA256 + AES-256-GCM, unique 26-char key |
| **4. Streaming Encryption** | Handles large files on any device | 4MB chunks, AES-GCM per chunk, safe for low-RAM devices |

For full technical details, consult the [Technical Architecture](https://github.com/ObscuritySecurity/CrytoTool/blob/main/architecture.md).

---

### Key Features

**Advanced Security & Privacy**
-   **IndexedDB Encryption:** Files are automatically encrypted using AES-256-GCM with keys derived from your Master Password via Argon2id. For more details, see the [Technical Architecture](https://github.com/ObscuritySecurity/CrytoTool/blob/main/architecture.md) (Section 1).
-   **Strong Master Password:** Secure your entire vault with a master password (minimum 30 characters).
-   **Encrypted Backups:** Create fully encrypted backups protected by a unique, separate encryption key using PBKDF2-SHA256 and AES-256-GCM. For more details, see the [Technical Architecture](https://github.com/ObscuritySecurity/CrytoTool/blob/main/architecture.md) (Section 3).
-   **Critical Settings Password:** Add an optional, second password to protect access to sensitive settings.
-   **Progressive Lockout:** The app automatically locks for increasing durations after multiple failed password attempts.
-   **Self-Destruct Mechanism:** Optionally configure the app to automatically and securely wipe all data after a set number of failed attempts.
-   **Access Recovery:** Regain access to your vault if you lose your master password using either 10 single-use recovery codes or a unique, one-time reset token.
-   **Auto-Lock & Visual Obfuscation:** The app can automatically lock and blur the screen after a period of inactivity.

**Effortless Code Management**
-   **Add Codes Easily:** Add new 2FA accounts by entering details manually or by scanning a QR code from an image in your gallery.
-   **Powerful Search:** Instantly find any code by searching for its issuer or account name.
-   **Safe Deletion:** Move codes to a Trash area, from where you can restore them or delete them permanently.
-   **Manual & Streaming Encryption:** Encrypt files manually with 6 algorithms (AES-GCM, XChaCha20-Poly1305, ChaCha20-Poly1305, AES-CTR, Salsa20-Poly1305, AES-GCM-Stream). For more details, see the [Technical Architecture](https://github.com/ObscuritySecurity/CrytoTool/blob/main/architecture.md) (Sections 2 & 4).

**Deep Customization**
-   **Theme Gallery & Accent Colors:** Personalize the app's appearance with a rich theme gallery and a custom accent color picker.
-   **Multi-Language Support:** The interface is available in over 50 languages to provide a native experience for people worldwide.

---

### Documentation

Explore these guides to understand our project's principles, technical design, and how you can get involved.

-   [Code of Conduct](https://github.com/ObscuritySecurity/TwoAuth/blob/main/.GitHub/CODE_OF_CONDUCT.md) Our pledge to maintain a harassment-free and inclusive community.
-   [Contributing Guide](https://github.com/ObscuritySecurity/TwoAuth/blob/main/.GitHub/CONTRIBUTING.md) Instructions on how to contribute to the project.
-   [License](https://github.com/ObscuritySecurity/TwoAuth/blob/main/LICENSE) The Apache 2.0 license under which this software is provided.
-   [Security Analysis](https://github.com/ObscuritySecurity/TwoAuth/blob/main/.GitHub/SECURITY.md) A detailed overview of the security measures and threat model.
-   [Technical Architecture](https://github.com/ObscuritySecurity/CrytoTool/blob/main/architecture.md) A deep dive into the technical design and encryption model.
-   [UI/UX Design Standards](https://github.com/ObscuritySecurity/CrytoTool/blob/main/DESIGN.md) Design rules, terminology (people not users), visual language, accessibility, and i18n standards.

### Spread the mission

We do not need your money. We need your voice.

Our mission is to build software that respects people, and that mission can only succeed if people know there is a better way. If you believe in this project, the most valuable contribution you can make is to share it.

Talk about it. Write about it. Show it to your friends. Help us prove that a private, secure, and respectful internet is not only possible—it's necessary.
