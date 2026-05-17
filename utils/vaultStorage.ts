
/**
 * VAULT STORAGE SERVICE
 *
 * Stochează și gestionează cheile de criptare manuale în Vault.
 * Toate cheile sunt criptate cu Vault Key (AES-256-GCM) înainte de a fi salvate în localStorage.
 *
 * Format stocat în localStorage: crytotool_vault_keys
 * Structură criptată: { iv: base64, data: base64 } unde 'data' este JSON-ul criptat al cheilor
 */

import { cryptoService } from './crypto';

export interface VaultKeyEntry {
    id: string;
    key: string;
    algorithm: string;
    fileName: string;
    categoryId: string;
    date: string;
    fileId: string;
}

const STORAGE_KEY = 'crytotool_vault_keys';

/**
 * Generate a random ID suffix using a cryptographically secure
 * random number generator. Throws if CSPRNG is unavailable.
 */
function generateRandomIdSuffix(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charsLength = chars.length;

    const cryptoObj: Crypto | null =
        (typeof window !== 'undefined' && (window.crypto || (window as any).msCrypto)) ||
        (typeof self !== 'undefined' && (self as any).crypto) ||
        null;

    if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
        throw new Error('Cryptographically secure random number generator not available');
    }

    const randomValues = new Uint8Array(length);
    cryptoObj.getRandomValues(randomValues);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % charsLength];
    }
    return result;
}

export const vaultStorage = {
    async getAll(): Promise<VaultKeyEntry[]> {
        try {
            const encryptedData = localStorage.getItem(STORAGE_KEY);
            if (!encryptedData) return [];

            const parsed = JSON.parse(encryptedData);
            // Check if data is encrypted (new format)
            if (parsed.iv && parsed.data) {
                const decrypted = await cryptoService.decryptString(parsed.data, parsed.iv);
                return JSON.parse(decrypted);
            }
            // Legacy format (plaintext) - migrate on next save
            return parsed;
        } catch {
            return [];
        }
    },

    async save(entry: Omit<VaultKeyEntry, 'id' | 'date'>): Promise<VaultKeyEntry> {
        const keys = await this.getAll();
        const newEntry: VaultKeyEntry = {
            ...entry,
            id: `vk_${Date.now()}_${generateRandomIdSuffix(6)}`,
            date: new Date().toLocaleDateString(),
        };
        keys.push(newEntry);
        await this.saveAll(keys);
        return newEntry;
    },

    // Internal method to encrypt and save all keys
    async saveAll(keys: VaultKeyEntry[]): Promise<void> {
        try {
            const jsonString = JSON.stringify(keys);
            const encrypted = await cryptoService.encryptString(jsonString);
            const stored = JSON.stringify({ iv: encrypted.iv, data: encrypted.ciphertext });
            localStorage.setItem(STORAGE_KEY, stored);
        } catch (e) {
            console.error('Failed to save vault keys:', e);
            throw new Error('Vault Key not available. Please unlock the vault first.');
        }
    },

    async getById(id: string): Promise<VaultKeyEntry | undefined> {
        const keys = await this.getAll();
        return keys.find(k => k.id === id);
    },

    async getByCategory(categoryId: string): Promise<VaultKeyEntry[]> {
        const keys = await this.getAll();
        return keys.filter(k => k.categoryId === categoryId);
    },

    async getByFileId(fileId: string): Promise<VaultKeyEntry | undefined> {
        const keys = await this.getAll();
        return keys.find(k => k.fileId === fileId);
    },

    async delete(id: string): Promise<void> {
        const keys = await this.getAll();
        const filtered = keys.filter(k => k.id !== id);
        await this.saveAll(filtered);
    },

    clear(): void {
        localStorage.removeItem(STORAGE_KEY);
    },

    async countByCategory(categoryId: string): Promise<number> {
        const keys = await this.getByCategory(categoryId);
        return keys.length;
    },

    async totalCount(): Promise<number> {
        const keys = await this.getAll();
        return keys.length;
    }
};
