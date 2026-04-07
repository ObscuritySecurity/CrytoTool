
/**
 * VAULT STORAGE SERVICE
 * 
 * Stochează și gestionează cheile de criptare manuale în Vault.
 * Fiecare cheie are un ID unic pentru auto-completare la decriptare.
 * 
 * Format stocat în localStorage: crytotool_vault_keys
 * Structură: { id, key, algorithm, fileName, categoryId, date, fileId }
 */

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

export const vaultStorage = {
    getAll(): VaultKeyEntry[] {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    save(entry: Omit<VaultKeyEntry, 'id' | 'date'>): VaultKeyEntry {
        const keys = this.getAll();
        const newEntry: VaultKeyEntry = {
            ...entry,
            id: `vk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            date: new Date().toLocaleDateString(),
        };
        keys.push(newEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
        return newEntry;
    },

    getById(id: string): VaultKeyEntry | undefined {
        return this.getAll().find(k => k.id === id);
    },

    getByCategory(categoryId: string): VaultKeyEntry[] {
        return this.getAll().filter(k => k.categoryId === categoryId);
    },

    getByFileId(fileId: string): VaultKeyEntry | undefined {
        return this.getAll().find(k => k.fileId === fileId);
    },

    delete(id: string): void {
        const keys = this.getAll().filter(k => k.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    },

    clear(): void {
        localStorage.removeItem(STORAGE_KEY);
    },

    countByCategory(categoryId: string): number {
        return this.getByCategory(categoryId).length;
    },

    totalCount(): number {
        return this.getAll().length;
    }
};
