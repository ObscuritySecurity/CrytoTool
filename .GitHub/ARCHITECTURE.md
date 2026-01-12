# CrytoTool - Technical Architecture

This document provides a deep dive into the technical design, architectural patterns, and cryptographic model of the CrytoTool application.

## 1. Core Philosophy & Architecture

CrytoTool is built on two fundamental principles: **Zero-Knowledge** and **Offline-First**.

*   **Zero-Knowledge**: All user data, especially sensitive content and encryption keys, is encrypted and decrypted exclusively on the client-side. No unencrypted data or private keys ever leave the people device.
*   **Offline-First**: The application is fully functional without an internet connection. This is achieved by using modern browser storage APIs (IndexedDB) as the primary database, eliminating reliance on external servers for core functionality.

## 2. Technology Stack

*   **Framework**: [Next.js](https://nextjs.org/) with the App Router, utilizing React Server Components (RSC) and Server Actions for a modern, performant architecture.
*   **Language**: [TypeScript](https://www.typescriptlang.org/) for robust type safety and improved developer experience.
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/), a collection of beautifully designed, accessible, and composable components built on Radix UI and Tailwind CSS.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first CSS workflow.
*   **Client-Side Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via the `idb` library, providing a powerful, asynchronous, transactional database in the browser for all file metadata and content chunks.

## 3. Data Storage Model (IndexedDB)

All application data is stored locally in the browser and application usingg IndexedDB. The database is structured into several object stores:

*   `file-metadata`: Stores an object for each file and folder. This includes `id`, `name`, `type`, `parentId`, `size`, `modified` date, custom metadata (colors, icons, tags), and encryption details (`isEncrypted`, `algorithm`).
*   `file-chunks`: Stores the actual content of files, broken into 16MB chunks. This allows the app to handle large files efficiently without loading them entirely into memory. Each chunk is a `Blob` object, keyed by a unique chunk ID.
*   `encryption-keys`: Acts as the **Encryption Key Vault**. It stores the individual keys used for file encryption, but only if the user chooses to save them. Each entry is protected by the people PIN.
*   `audit-log`: A chronological log of important security and file-related events for people transparency.

## 4. Cryptographic Model

Security is multi-layered, ensuring that a compromise at one level does not cascade.

### Layer 1: The Master Password

The Master Password is the root of trust for the entire application.

1.  **Key Derivation**: The people Master Password is **never stored directly**. Instead, it is passed through **PBKDF2-HMAC-SHA256** with a unique, randomly-generated 16-byte salt and over 100,000 iterations.
2.  **Derived Key**: This process produces a strong, 256-bit derived key. This is the key used to encrypt and decrypt the application's entire local database when it is locked or unlocked.

### Layer 2: Individual File Encryption (Encrypt-then-MAC)

When a people encrypts a file, a new, unique process begins:

1.  **Key Generation**: A new, cryptographically secure 32-byte key is generated on the client-side specifically for this file.
2.  **Algorithm Selection**: The people selects an algorithm (e.g., `AES-GCM`, `XChaCha20-Poly1305`).
3.  **Encryption**: The file's content is read as a stream and encrypted chunk by chunk.
4.  **Authenticated Encryption**: All selected algorithms are **AEAD** (Authenticated Encryption with Associated Data) ciphers. This is a critical feature. It means that in addition to making the data unreadable (confidentiality), it also generates an **authentication tag**. This tag mathematically guarantees that the encrypted data has not been tampered with or corrupted (integrity & authenticity).
5.  **Data Structure**: The final encrypted file is structured as:
    `[ALGORITHM_ID (1 byte)] + [NONCE (12-24 bytes)] + [ENCRYPTED_DATA] + [AUTHENTICATION_TAG (16 bytes)]`
    This structure ensures that upon decryption, the app knows exactly which algorithm and nonce to use and can verify the data's integrity using the tag.

### Layer 3: The Encryption Key Vault

To manage the unique keys for each file, the user can save them to the Vault.

1.  **PIN Protection**: The Vault itself is protected by a separate 6-digit PIN. This PIN is also passed through PBKDF2 to derive a key.
2.  **Vault Encryption**: The key derived from the PIN is used to encrypt the `encryption-keys` object store in IndexedDB. This means an attacker would need to bypass both the Master Password and the Vault PIN to access saved keys.
3.  **Brute-Force Resistance**: The Vault has its own progressive lockout mechanism, making it computationally expensive to guess the PIN through repeated attempts.

This multi-layered, client-side model ensures that data remains secure and private under all circumstances, with no single point of failure.
