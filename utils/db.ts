
import { cryptoService, CryptoAlgorithm } from './crypto';
import { metadataCrypto, EncryptedMeta } from './metadataCrypto';

const DB_NAME = 'CrytoToolVault';
const DB_VERSION = 3;
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
  fileData?: Blob;
  iv?: string;
  salt?: string;
  algorithm?: CryptoAlgorithm;
  isEncrypted?: boolean;
  isFavorite?: boolean;
  isTrashed?: boolean;
  iconOnlyMode?: boolean;
  encryptedMeta?: EncryptedMeta;
  tags?: Tag[];
  artist?: string;
  album?: string;
  coverUrl?: string;
  customIcon?: string;
  externalUrl?: string;
}

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
        if (e.oldVersion < 3) {
          const transaction = (e.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const store = transaction.objectStore(STORE_NAME);
            store.openCursor().onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result;
              if (cursor) {
                const item = cursor.value;
                if (!item.encryptedMeta && item.name) {
                  item.encryptedMeta = {
                    ciphertext: btoa(unescape(encodeURIComponent(item.name))),
                    iv: '',
                  };
                  delete item.tags;
                  delete item.artist;
                  delete item.album;
                  delete item.coverUrl;
                  delete item.customIcon;
                  delete item.externalUrl;
                  cursor.update(item);
                }
                cursor.continue();
              }
            };
          }
        }
      };
    });
  }

  async addItem(item: DBItem): Promise<void> {
    await this.ensureInit();

    if (!item.encryptedMeta && (item.name || item.tags || item.artist || item.album || item.coverUrl || item.customIcon || item.externalUrl)) {
      try {
        item.encryptedMeta = await metadataCrypto.encrypt({
          name: item.name || 'untitled',
          tags: item.tags,
          artist: item.artist,
          album: item.album,
          coverUrl: item.coverUrl,
          customIcon: item.customIcon,
          externalUrl: item.externalUrl,
        });
        item = metadataCrypto.stripFromItem(item) as DBItem;
      } catch {
        // vault key unavailable — store unencrypted
      }
    }
    
    if (item.fileData && !item.isEncrypted) {
        const encrypted = await cryptoService.encrypt(item.fileData);
        const ciphertextBuffer = encrypted.ciphertext.buffer.slice(encrypted.ciphertext.byteOffset, encrypted.ciphertext.byteOffset + encrypted.ciphertext.byteLength) as ArrayBuffer;
        item.fileData = new Blob([ciphertextBuffer]);
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

    if (!item.encryptedMeta && (item.name || item.tags || item.artist || item.album || item.coverUrl || item.customIcon || item.externalUrl)) {
      try {
        item.encryptedMeta = await metadataCrypto.encrypt({
          name: item.name || 'untitled',
          tags: item.tags,
          artist: item.artist,
          album: item.album,
          coverUrl: item.coverUrl,
          customIcon: item.customIcon,
          externalUrl: item.externalUrl,
        });
        item = metadataCrypto.stripFromItem(item) as DBItem;
      } catch {
        // vault key unavailable — store unencrypted
      }
    }

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
                   reader.readAsDataURL(item.fileData!);
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
          try {
              if (typeof item.id !== 'string' || typeof item.name !== 'string') {
                if (!item.id && !item.name) {
                  console.warn('Skipping invalid item during import (missing id/name):', item.id);
                  continue;
                }
              }
              const validTypes = ['file', 'folder', 'note', 'encrypted'];
              if (item.type && !validTypes.includes(item.type)) {
                console.warn('Skipping item with invalid type during import:', item.id, item.type);
                continue;
              }
              if (item.fileDataBase64 !== undefined && typeof item.fileDataBase64 !== 'string') {
                console.warn('Skipping item with invalid fileDataBase64 during import:', item.id);
                continue;
              }
              if (item.encryptedMeta !== undefined) {
                if (typeof item.encryptedMeta !== 'object' || item.encryptedMeta === null || typeof (item.encryptedMeta as any).iv !== 'string' || typeof (item.encryptedMeta as any).ciphertext !== 'string') {
                  console.warn('Skipping item with invalid encryptedMeta during import:', item.id);
                  continue;
                }
              }

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
          } catch (e) {
              console.warn('Skipping item due to validation error during import:', item.id, e);
          }
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
