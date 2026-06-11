import { ensureInit, stream_encrypt as wasm_stream_encrypt, stream_decrypt as wasm_stream_decrypt } from '../crypto-core/index';
import { getArgonParams } from './platform';

let inited = false;
async function initOnce() {
  if (!inited) { await ensureInit(); inited = true; }
}

const CHUNK_SIZE = 4 * 1024 * 1024;

export const streamCrypto = {
  CHUNK_SIZE,

  async encrypt(data: Uint8Array, passphrase: string): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; algorithm: string }> {
    await initOnce();
    const { iterations, memorySize, parallelism } = await getArgonParams();
    const fullData = wasm_stream_encrypt(data, passphrase, iterations, memorySize, parallelism);

    const magicLen = fullData[0];
    const algoLen = fullData[1 + magicLen + 1 + 1];
    const saltOffset = 1 + magicLen + 1 + 1 + algoLen + 4 + 4 + 8;
    const salt = fullData.slice(saltOffset, saltOffset + 16);

    return { ciphertext: fullData, salt, algorithm: 'AES-GCM-Stream' };
  },

  async decrypt(encryptedData: Uint8Array, passphrase: string): Promise<Uint8Array> {
    await initOnce();
    const { iterations, memorySize, parallelism } = await getArgonParams();
    return wasm_stream_decrypt(encryptedData, passphrase, iterations, memorySize, parallelism);
  },
};
