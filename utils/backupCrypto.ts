
/**
 * BACKUP CRYPTO SERVICE
 * 
 * This file contains exclusively the cryptographic logic for the backup system.
 * It is isolated to facilitate security auditing.
 * 
 * Algorithms used:
 * - Key Derivation: PBKDF2-SHA256 (100,000 iterations, salt 16 bytes)
 * - Encryption: AES-256-GCM (Authenticated Encryption)
 * - Passphrase Entropy: 26 cryptographically generated Base32-like characters (130 bits)
 * 
 * Backup file format:
 * [salt (16 bytes)] + [IV (12 bytes)] + [AES-GCM ciphertext + 16-byte GCM tag]
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

class BackupEncryptionService {
    
    /**
     * Generates a readable random key for backup (e.g., "X9F2-KLP0-...")
     * Uses window.crypto.getRandomValues for secure entropy.
     * 26 characters × 5 bits = 130 bits entropy.
     */
    generatePassphrase(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        const targetLength = 26;
        const alphabetLength = chars.length;
        const maxUnbiased = Math.floor(256 / alphabetLength) * alphabetLength;
        let generated = 0;

        while (generated < targetLength) {
            const randomValues = new Uint8Array(32);
            window.crypto.getRandomValues(randomValues);

            for (let j = 0; j < randomValues.length && generated < targetLength; j++) {
                const value = randomValues[j];
                if (value >= maxUnbiased) continue;

                result += chars[value % alphabetLength];
                generated++;
                if (generated % 4 === 0 && generated !== targetLength) result += '-';
            }
        }

        return result;
    }

    /**
     * Derives AES-256 key from passphrase using PBKDF2-SHA256.
     * 100,000 iterations + 16 bytes random salt.
     */
    private async keyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(passphrase),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypts the entire backup JSON.
     * Protocol:
     * 1. Generate random salt (16 bytes)
     * 2. Derive AES-256 key with PBKDF2 (100k iterations)
     * 3. Generate unique IV (12 bytes)
     * 4. Encrypt with AES-GCM
     * 5. Concatenate: salt + IV + ciphertext
     */
    async encryptBackup(jsonString: string, passphrase: string): Promise<Blob> {
        const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const key = await this.keyFromPassphrase(passphrase, salt);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(jsonString);

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encodedData
        );

        // File format: [salt (16 bytes)] + [IV (12 bytes)] + [Encrypted Data]
        const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(ciphertext), salt.length + iv.length);

        return new Blob([result], { type: 'application/octet-stream' });
    }

    /**
     * Decrypts the backup file.
     * Extracts salt, derives key with PBKDF2, then decrypts.
     */
    async decryptBackup(backupBlob: Blob, passphrase: string): Promise<string> {
        const arrayBuffer = await backupBlob.arrayBuffer();
        const fullData = new Uint8Array(arrayBuffer);

        // Validate minimum length: salt (16) + IV (12) + min 16 bytes (GCM tag)
        if (fullData.length < SALT_LENGTH + 12 + 16) {
            throw new Error("File is corrupt or invalid (too short).");
        }

        // Extract salt (first 16 bytes)
        const salt = fullData.slice(0, SALT_LENGTH);
        // Extract IV (next 12 bytes)
        const iv = fullData.slice(SALT_LENGTH, SALT_LENGTH + 12);
        // Rest is ciphertext
        const ciphertext = fullData.slice(SALT_LENGTH + 12);

        const key = await this.keyFromPassphrase(passphrase, salt);

        let decryptedBuffer: ArrayBuffer;
        try {
            decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                ciphertext
            );
        } catch {
            throw new Error("Invalid passphrase or corrupted backup file.");
        }

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    }
}

export const backupCryptoService = new BackupEncryptionService();
