import { stream_encrypt, stream_decrypt, random_bytes } from '../crypto-core/index';

const DEFAULT_ARGON = { iterations: 3, memoryKib: 65536, parallelism: 4 };

export const streamCrypto = {
  async encrypt(
    data: Uint8Array,
    passphrase: string,
    argonIterations?: number,
    argonMemoryKib?: number,
    argonParallelism?: number,
  ): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; iv: Uint8Array; algorithm: string }> {
    const result = await stream_encrypt(
      data, passphrase,
      argonIterations ?? DEFAULT_ARGON.iterations,
      argonMemoryKib ?? DEFAULT_ARGON.memoryKib,
      argonParallelism ?? DEFAULT_ARGON.parallelism,
    );
    const salt = random_bytes(16);
    const iv = random_bytes(12);
    return {
      ciphertext: result,
      salt,
      iv,
      algorithm: 'AES-GCM-Stream',
    };
  },

  async decrypt(
    encryptedData: Uint8Array,
    passphrase: string,
    argonIterations?: number,
    argonMemoryKib?: number,
    argonParallelism?: number,
  ): Promise<Uint8Array> {
    return stream_decrypt(
      encryptedData, passphrase,
      argonIterations ?? DEFAULT_ARGON.iterations,
      argonMemoryKib ?? DEFAULT_ARGON.memoryKib,
      argonParallelism ?? DEFAULT_ARGON.parallelism,
    );
  },
};
