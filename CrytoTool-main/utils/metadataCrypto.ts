
import { cryptoService } from './crypto';
import type { Tag } from './db';

export interface MetadataPlaintext {
  name: string;
  tags?: Tag[];
  artist?: string;
  album?: string;
  coverUrl?: string;
  customIcon?: string;
  externalUrl?: string;
}

export interface EncryptedMeta {
  ciphertext: string;
  iv: string;
}

export const metadataCrypto = {
  async encrypt(meta: MetadataPlaintext): Promise<EncryptedMeta> {
    const json = JSON.stringify(meta);
    return await cryptoService.encryptString(json);
  },

  async decrypt(encrypted: EncryptedMeta): Promise<MetadataPlaintext> {
    const json = await cryptoService.decryptString(encrypted.ciphertext, encrypted.iv);
    return JSON.parse(json);
  },

  hasEncryptedMeta(item: any): item is { encryptedMeta: EncryptedMeta } {
    return !!item?.encryptedMeta?.ciphertext && !!item?.encryptedMeta?.iv;
  },

  async extractPlaintext(item: any): Promise<MetadataPlaintext | null> {
    if (this.hasEncryptedMeta(item)) {
      return await this.decrypt(item.encryptedMeta);
    }
    if (item.name) {
      return {
        name: item.name,
        tags: item.tags,
        artist: item.artist,
        album: item.album,
        coverUrl: item.coverUrl,
        customIcon: item.customIcon,
        externalUrl: item.externalUrl,
      };
    }
    return null;
  },

  async getDisplayName(item: any): Promise<string> {
    if (this.hasEncryptedMeta(item)) {
      const meta = await this.decrypt(item.encryptedMeta);
      return meta.name;
    }
    return item.name || 'Unknown';
  },

  stripFromItem(item: any): any {
    const stripped = { ...item, name: '' };
    delete stripped.tags;
    delete stripped.artist;
    delete stripped.album;
    delete stripped.coverUrl;
    delete stripped.customIcon;
    delete stripped.externalUrl;
    return stripped;
  },
};
