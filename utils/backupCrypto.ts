import { ensureInit, derive_key, aes_gcm_encrypt, aes_gcm_decrypt } from '../crypto-core/index';
import { getArgonParams } from './platform';

const SALT_LENGTH = 16;

let inited = false;
async function initOnce() {
  if (!inited) { await ensureInit(); inited = true; }
}

class BackupEncryptionService {

  generatePassphrase(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const targetLength = 26;
    const alphabetLength = chars.length;
    const maxUnbiased = Math.floor(256 / alphabetLength) * alphabetLength;
    let generated = 0;

    while (generated < targetLength) {
      const randomValues = new Uint8Array(32);
      crypto.getRandomValues(randomValues);

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

  private async keyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
    await initOnce();
    const { iterations, memorySize, parallelism } = await getArgonParams();
    return derive_key(
      new TextEncoder().encode(passphrase),
      salt,
      iterations,
      memorySize,
      parallelism,
      32,
    );
  }

  async encryptBackup(jsonString: string, passphrase: string): Promise<Blob> {
    await initOnce();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await this.keyFromPassphrase(passphrase, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(jsonString);

    const ciphertext = aes_gcm_encrypt(encodedData, key, iv);

    const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(ciphertext, salt.length + iv.length);

    return new Blob([result], { type: 'application/octet-stream' });
  }

  async decryptBackup(backupBlob: Blob, passphrase: string): Promise<string> {
    await initOnce();
    const arrayBuffer = await backupBlob.arrayBuffer();
    const fullData = new Uint8Array(arrayBuffer);

    if (fullData.length < SALT_LENGTH + 12 + 16) {
      throw new Error('File is corrupt or invalid (too short).');
    }

    const salt = fullData.slice(0, SALT_LENGTH);
    const iv = fullData.slice(SALT_LENGTH, SALT_LENGTH + 12);
    const ciphertext = fullData.slice(SALT_LENGTH + 12);

    const key = await this.keyFromPassphrase(passphrase, salt);

    let decrypted: Uint8Array;
    try {
      decrypted = aes_gcm_decrypt(ciphertext, key, iv);
    } catch {
      throw new Error('Invalid passphrase or corrupted backup file.');
    }

    return new TextDecoder().decode(decrypted);
  }
}

export const backupCryptoService = new BackupEncryptionService();
