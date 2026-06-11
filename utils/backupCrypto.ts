import { backup_encrypt, backup_decrypt, generate_passphrase } from '../crypto-core/index';

const DEFAULT_ARGON = { iterations: 3, memoryKib: 65536, parallelism: 4 };

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

export const backupCryptoService = {
  generatePassphrase(): string {
    return generate_passphrase();
  },

  generateBackupPassphrase(): string {
    return generate_passphrase();
  },

  async encryptBackup(
    data: string | Uint8Array,
    passphrase: string,
    argonIterations?: number,
    argonMemoryKib?: number,
    argonParallelism?: number,
  ): Promise<Uint8Array> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return backup_encrypt(
      bytes, passphrase,
      argonIterations ?? DEFAULT_ARGON.iterations,
      argonMemoryKib ?? DEFAULT_ARGON.memoryKib,
      argonParallelism ?? DEFAULT_ARGON.parallelism,
    );
  },

  async decryptBackup(
    data: Blob | Uint8Array,
    passphrase: string,
    argonIterations?: number,
    argonMemoryKib?: number,
    argonParallelism?: number,
  ): Promise<string> {
    const bytes = data instanceof Blob ? await blobToBytes(data) : data;
    const plaintext = await backup_decrypt(
      bytes, passphrase,
      argonIterations ?? DEFAULT_ARGON.iterations,
      argonMemoryKib ?? DEFAULT_ARGON.memoryKib,
      argonParallelism ?? DEFAULT_ARGON.parallelism,
    );
    return new TextDecoder().decode(plaintext);
  },
};
