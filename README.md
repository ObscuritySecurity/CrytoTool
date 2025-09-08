
# CrytoTool - Your Personal Security Fortress

CrytoTool is a modern, offline-first, browser-based application designed to give you absolute control over your digital life. It's not just a tool; it's a secure ecosystem running entirely on your device, ensuring that only you can access your data.

## ✨ Core Principles

*   **Security-First:** Built from the ground up with multi-layered security, from a robust master password to advanced mechanisms like a self-destruct sequence.
*   **Total Privacy:** All data, files, and keys are stored locally on your device within your browser's IndexedDB. Nothing is ever sent to an external server. You are in complete control.
*   **Offline-First:** The application is fully functional without an internet connection. Your security shouldn't depend on being online.

## 🚀 Key Features

CrytoTool is packed with features that provide a comprehensive security and productivity suite.

### 🛡️ Multi-Layered Security

*   **Master Password:** The entire application is secured by a single, strong master password.
*   **Two-Factor Authentication (2FA):** Add an extra layer of security using any standard authenticator app (e.g., Google Authenticator, Authy).
*   **Vault PIN:** A separate 6-digit PIN provides quick yet secure access to the encryption key vault.
*   **Self-Destruct Mechanism:** As a last resort, you can enable a self-destruct sequence. After 5 incorrect master password attempts, a timer starts. If a successful login doesn't occur within the configured time (10 seconds, 1 hour, or 24 hours), all application data is irreversibly wiped.
*   **Settings Password:** Protect the settings page with an optional secondary password to prevent unauthorized changes.

### 🔐 Encrypted File Management

*   **Full File System:** Create, rename, move, and organize files and folders with a familiar, intuitive interface.
*   **File-Level Encryption:** Encrypt individual files using modern, secure algorithms (ChaCha20-Poly1305, AES-CTR). The app generates a unique, strong encryption key for each operation.
*   **Integrated Key Vault:** Securely save and manage your generated encryption keys in a PIN-protected vault, ensuring you never lose access to your encrypted files.
*   **Offline Backup & Restore:** Create a single, fully-encrypted backup file (`.cbt`) containing your entire vault (files, keys, settings). Restore everything on any device, keeping you independent of any cloud service.

### 🕶️ Privacy & Automation

*   **Auto-Lock:** The application automatically locks and returns to the login screen after a configurable period of inactivity.
*   **Screen Blur on Idle:** After 30 seconds of inactivity, the screen blurs to protect against shoulder surfing, without logging you out.
*   **Offline Access Recovery:** Securely reset your master password using locally-stored recovery codes or a reset token.
*   **Local Audit Log:** A transparent, read-only log of all important security and file events, stored only on your device.

### 🎨 User Experience & Utilities

*   **Modern, Customizable UI:**
    *   **Themes:** Light, Dark, and System modes.
    *   **Accent Color:** Personalize the entire interface with a custom accent color.
    *   **Multi-Language Support:** Available in English, Romanian, and Spanish.
*   **File & Folder Customization:** Go beyond standard icons. Change colors, choose from hundreds of built-in icons, or upload your own. Organize with colored tags.
*   **Global Search:** Instantly find any file or folder by name or tag. Includes quick filters for images, videos, audio, and documents.
*   **Integrated Media Modules:**
    *   **Gallery:** A beautiful view of all your photos and videos.
    *   **Music Player:** A full-featured music library and player with support for albums, artists, and custom playlists.
    *   **Documents Viewer:** A dedicated space to browse all your text and PDF files.
*   **File Preview:** Preview images, PDFs, and text files directly within the app.

---

Thank you for checking out CrytoTool! We are committed to building the ultimate tool for digital sovereignty.
