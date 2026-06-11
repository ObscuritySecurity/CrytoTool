import { metadata_encrypt, metadata_decrypt, base64_decode, base64_encode } from '../crypto-core/index';
import { getVaultKey } from './vaultKey';
import type { EncryptedMeta, MetadataPlaintext } from '../types';

function vaultKey(): Uint8Array {
  try {
    return getVaultKey();
  } catch {
    throw new Error('Vault key not available');
  }
}

export const metadataCrypto = {
  async encrypt(plaintext: MetadataPlaintext): Promise<EncryptedMeta> {
    const key = vaultKey();
    const json = JSON.stringify(plaintext);
    const encrypted = metadata_encrypt(json, key);
    return JSON.parse(encrypted);
  },

  async decrypt(encrypted: EncryptedMeta): Promise<MetadataPlaintext> {
    const key = vaultKey();
    const json = JSON.stringify(encrypted);
    const decrypted = metadata_decrypt(json, key);
    return JSON.parse(decrypted);
  },

  hasEncryptedMeta(item: any): boolean {
    return !!(item && item.encryptedMeta && item.encryptedMeta.ciphertext);
  },

  async extractPlaintext(item: any): Promise<MetadataPlaintext | null> {
    if (!this.hasEncryptedMeta(item)) return null;
    try {
      return await this.decrypt(item.encryptedMeta);
    } catch {
      return null;
    }
  },

  getDisplayName(item: any): string {
    return item?.decryptedName || item?.name || 'untitled';
  },

  stripFromItem(item: any): any {
    delete item.name;
    delete item.tags;
    delete item.artist;
    delete item.album;
    delete item.coverUrl;
    delete item.customIcon;
    delete item.externalUrl;
    return item;
  },
};
