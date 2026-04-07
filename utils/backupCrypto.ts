
/**
 * BACKUP CRYPTO SERVICE
 * 
 * Acest fișier conține exclusiv logica criptografică pentru sistemul de backup.
 * Este izolat pentru a facilita auditul de securitate.
 * 
 * Algoritmi folosiți:
 * - Derivare cheie: PBKDF2-SHA256 (100,000 iterații, salt 16 bytes)
 * - Criptare: AES-256-GCM (Authenticated Encryption)
 * - Entropie Passphrase: 26 caractere Base32-like generate criptografic (130 biți)
 * 
 * Format fișier backup:
 * [salt (16 bytes)] + [IV (12 bytes)] + [AES-GCM ciphertext + 16-byte GCM tag]
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

class BackupEncryptionService {
    
    /**
     * Generează o cheie aleatorie citibilă pentru backup (ex: "X9F2-KLP0-...")
     * Folosește window.crypto.getRandomValues pentru entropie sigură.
     * 26 caractere × 5 biți = 130 biți entropie.
     */
    generatePassphrase(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        const randomValues = new Uint8Array(26);
        window.crypto.getRandomValues(randomValues);
        
        for (let i = 0; i < 26; i++) {
            result += chars[randomValues[i] % chars.length];
            if ((i + 1) % 4 === 0 && i !== 25) result += '-';
        }
        return result;
    }

    /**
     * Derivă cheie AES-256 din passphrase folosind PBKDF2-SHA256.
     * 100,000 iterații + salt aleatoriu de 16 bytes.
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
                salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
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
     * Criptează întregul JSON de backup.
     * Protocol:
     * 1. Generează salt aleatoriu (16 bytes)
     * 2. Derivă cheie AES-256 cu PBKDF2 (100k iterații)
     * 3. Generează IV unic (12 bytes)
     * 4. Criptează cu AES-GCM
     * 5. Concatenează: salt + IV + ciphertext
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

        // Format fișier: [salt (16 bytes)] + [IV (12 bytes)] + [Date Criptate]
        const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(ciphertext), salt.length + iv.length);

        return new Blob([result], { type: 'application/octet-stream' });
    }

    /**
     * Decriptează fișierul de backup.
     * Extrage salt-ul, derivă cheia cu PBKDF2, apoi decriptează.
     */
    async decryptBackup(backupBlob: Blob, passphrase: string): Promise<string> {
        const arrayBuffer = await backupBlob.arrayBuffer();
        const fullData = new Uint8Array(arrayBuffer);

        // Validare minimă lungime: salt (16) + IV (12) + minim 16 bytes (GCM tag)
        if (fullData.length < SALT_LENGTH + 12 + 16) {
            throw new Error("Fișier corupt sau invalid (prea scurt).");
        }

        // Extragem salt-ul (primii 16 bytes)
        const salt = fullData.slice(0, SALT_LENGTH);
        // Extragem IV (următorii 12 bytes)
        const iv = fullData.slice(SALT_LENGTH, SALT_LENGTH + 12);
        // Restul e ciphertext
        const ciphertext = fullData.slice(SALT_LENGTH + 12);

        const key = await this.keyFromPassphrase(passphrase, salt);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    }
}

export const backupCryptoService = new BackupEncryptionService();
