import { encrypt_string, decrypt_string, base64_encode, base64_decode, random_bytes } from '../crypto-core/index';
import { getVaultKey } from './vaultKey';

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

function generateRandomIdSuffix(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charsLength = chars.length;
  const randomValues = random_bytes(length);
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
      if (parsed.iv && parsed.data) {
        const key = getVaultKey();
        const decrypted = decrypt_string(parsed.data, parsed.iv, key);
        return JSON.parse(decrypted);
      }
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

  async saveAll(keys: VaultKeyEntry[]): Promise<void> {
    try {
      const jsonString = JSON.stringify(keys);
      const key = getVaultKey();
      const encrypted = encrypt_string(jsonString, key);
      const parsed = JSON.parse(encrypted);
      const stored = JSON.stringify({ iv: parsed.iv, data: parsed.ciphertext });
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
  },
};
