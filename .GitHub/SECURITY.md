# CrytoTool Security Policy

This document provides a detailed overview of the security architecture, principles, and threat model for the CrytoTool application.

## Core Security Principles

Our security model is built upon a foundation of principles designed to provide the highest level of privacy and data protection for our people

1.  **Zero-Knowledge**: We, the developers, have no access to your data. Your Master Password, encryption keys, and file contents are never transmitted to our servers because we don't have any. All cryptographic operations occur exclusively on your device.

2.  **Offline-First**: The application is designed to be fully functional without an internet connection. This architecture inherently reduces the attack surface by eliminating risks associated with data in transit and centralized cloud storage.

3.  **Client-Side Encryption**: All encryption and decryption happen directly on your machine. Your unencrypted data never leaves your device.

4.  **Open Source & Verifiable**: CrytoTool is 100% open source. We encourage public auditing of our codebase to verify our security claims. Trust should be earned through transparency, not blind faith.

## Encryption Architecture

CrytoTool employs a multi-layered encryption strategy to protect your data at every level.

### 1. Master Password & Key Derivation

Your Master Password is the ultimate key to your vault. It is never stored directly. Instead, it is used to derive a strong encryption key using **PBKDF2 (Password-Based Key Derivation Function 2)** with a unique salt and a high number of iterations (100,000+).

-   **Algorithm**: PBKDF2-HMAC-SHA256
-   **Function**: This process makes brute-force attacks against your Master Password computationally infeasible.

The derived key is then used to encrypt the application's core database, including settings and metadata.

### 2. Individual File Encryption

When you choose to encrypt a file, you are given the choice of several elite, modern cryptographic algorithms. For each file, a **new, cryptographically secure 32-byte key** is generated on your device.

-   **Algorithms Available**:
    -   **AES-256-GCM** & **AES-256-CTR**: The global standard, trusted by governments worldwide.
    -   **XChaCha20-Poly1305**: An extremely fast and modern stream cipher, excellent for performance on devices without hardware AES acceleration.
    -   **ChaCha20-Poly1305** & **Salsa20-Poly1305**: Well-respected and battle-tested predecessors to XChaCha20.

-   **Authenticated Encryption**: All chosen algorithms are implemented as AEAD (Authenticated Encryption with Associated Data) ciphers. This means that in addition to confidentiality, the integrity and authenticity of your data are also guaranteed. Any tampering with the encrypted file will cause the decryption to fail.

### 3. Encryption Key Vault

To avoid the hassle of managing individual file keys, you can save them to the **Encryption Key Vault**.

-   **Protection**: The Vault is encrypted with a key derived from your **6-digit PIN**.
-   **Brute-Force Mitigation**: The Vault features a progressive lockout mechanism. After several incorrect PIN attempts, the Vault is temporarily locked, with the lockout duration increasing after each subsequent failure.
-   **Weak PIN Prevention**: The app maintains a blacklist of common and easily guessable PINs to prevent people from choosing weak credentials.

## Threat Model & Mitigations

We have designed CrytoTool to protect against a range of potential threats.

| Threat Scenario | Attacker | Mitigation Strategy |
| :--- | :--- | :--- |
| **Remote Server Breach** | Remote Hacker | **Not Applicable.** CrytoTool is an offline-first application. Your data and keys are not stored on our servers, so there is no central database to attack. |
| **Physical Device Theft** | Thief | **Multi-Layered Encryption.** The attacker must first bypass your device's own security (OS login, disk encryption). Even then, all application data is encrypted with a key derived from your strong Master Password. Brute-force attacks are thwarted by the Self-Destruct or progressive lockout features. |
| **"Shoulder Surfing"** | Casual Observer | **Screen Blur on Idle.** If you step away from your device, the app's interface automatically blurs after a short period, obscuring all on-screen information without requiring a full logout. |
| **Network Eavesdropping (Man-in-the-Middle)** | Network Attacker | **Not Applicable.** The app does not require an internet connection for its core functionality. All cryptographic operations are performed locally, so no sensitive data is ever transmitted over a network. |
| **Malicious Code / Backdoor in Application** | Malicious Insider / State Actor | **Open Source & Verifiable Code.** The entire codebase is open for public inspection and auditing. This transparency ensures that no hidden backdoors or malicious functions can exist without being discovered by the security community. |
| **Data Recovery from Discarded Hard Drive** | Forensics Expert | **Secure Data Shredder.** When the optional "Secure Data Shredder" feature is enabled, permanently deleting a file overwrites its data multiple times with random noise, making forensic recovery of the original data computationally infeasible. |
| **Compromise of a Single File Key** | Targeted Attacker | **Key Isolation.** Each encrypted file uses a unique, randomly generated key. The compromise of one file's key does not affect the security of any other encrypted file. |
| **Weak User-Chosen Password** | Brute-force Attack | **Enforced Password Complexity.** The application mandates a minimum 30-character Master Password with complexity requirements, making weak passwords difficult to set. For file keys, the app generates strong random keys by default. |
