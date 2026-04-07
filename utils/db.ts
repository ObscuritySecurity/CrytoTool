
import { cryptoService, CryptoAlgorithm } from './crypto';

const DB_NAME = 'CrytoToolVault';
const DB_VERSION = 2; // Incremented version for schema change if needed (but keypath same)
const STORE_NAME = 'files';

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface DBItem {
  id: string;
  parentId: string | null;
  type: 'file' | 'folder' | 'system';
  name: string;
  size?: string;
  date: string;
  status?: string;
  category?: 'image' | 'video' | 'audio' | 'doc' | 'other';
  // Stocăm datele criptate
  fileData?: Blob; 
  iv?: string; // Base64
  salt?: string; // Base64 (for key derivation)
  algorithm?: CryptoAlgorithm;
  isEncrypted?: boolean;
  externalUrl?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  isFavorite?: boolean;
  isTrashed?: boolean;
  tags?: Tag[];
  customIcon?: string;
  iconOnlyMode?: boolean;
}

// Interfață pentru Export (serializare Blob -> Base64)
export interface ExportedItem extends Omit<DBItem, 'fileData'> {
    fileDataBase64?: string;
}

class VaultDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (e) => reject("Database error");
      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve();
      };
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async addItem(item: DBItem): Promise<void> {
    await this.ensureInit();
    
    if (item.fileData && !item.isEncrypted) {
        const encrypted = await cryptoService.encrypt(item.fileData);
        item.fileData = new Blob([encrypted.ciphertext]);
        item.iv = cryptoService.arrayBufferToBase64(encrypted.iv);
        item.algorithm = 'AES-GCM';
        item.isEncrypted = true;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateItem(item: DBItem): Promise<void> {
    await this.ensureInit();
    
    // NOTE: Manual encryption only via EncryptionModal. No auto-encryption.

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllItems(): Promise<DBItem[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        const items = request.result as DBItem[];
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteItem(id: string): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearDatabase(): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }

  // --- EXPORT / IMPORT LOGIC ---

  async exportDatabase(): Promise<ExportedItem[]> {
      const items = await this.getAllItems();
      const exported: ExportedItem[] = await Promise.all(items.map(async (item) => {
          let b64 = undefined;
          if (item.fileData) {
              b64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      const res = reader.result as string;
                      resolve(res.split(',')[1]); 
                  };
                  reader.readAsDataURL(item.fileData);
              });
          }
          const { fileData, ...rest } = item;
          return { ...rest, fileDataBase64: b64 };
      }));
      return exported;
  }

  async importDatabase(items: ExportedItem[]): Promise<void> {
      await this.clearDatabase();
      await this.ensureInit();
      
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const item of items) {
          let blob = undefined;
          if (item.fileDataBase64) {
              const byteCharacters = atob(item.fileDataBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              blob = new Blob([byteArray]);
          }
          
          const { fileDataBase64, ...rest } = item;
          const dbItem: DBItem = { ...rest, fileData: blob };
          store.add(dbItem);
      }
      
      return new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
      });
  }

  private async ensureInit() {
    if (!this.db) await this.init();
  }
}

export const db = new VaultDB();
