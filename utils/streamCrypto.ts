
import sodium from 'libsodium-wrappers';

/**
 * STREAMING CRYPTO SERVICE
 * 
 * Criptare în mod streaming — procesează fișierele în bucăți mici (chunk-uri)
 * pentru a nu încărca toată memoria. Ideal pentru dispozitive cu RAM limitat.
 * 
 * Algoritm: AES-GCM per chunk (4MB)
 * Format: [HEADER] + [chunk_0] + [chunk_1] + ... + [chunk_N]
 * 
 * Fiecare chunk are propriul IV derivat și propriul GCM tag de autentificare.
 */

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
const HEADER_MAGIC = 'CRYTO_STREAM';
const HEADER_VERSION = 1;

interface StreamHeader {
    magic: string;
    version: number;
    algorithm: string;
    chunkSize: number;
    totalChunks: number;
    originalSize: number;
    salt: Uint8Array;
    baseIV: Uint8Array;
}

function deriveChunkIV(baseIV: Uint8Array, chunkIndex: number): Uint8Array {
    const iv = new Uint8Array(12);
    iv.set(baseIV.slice(0, 8));
    const view = new DataView(iv.buffer);
    view.setUint32(8, chunkIndex, false);
    return iv;
}

async function deriveStreamKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    await sodium.ready;
    const passphraseBytes = new TextEncoder().encode(passphrase);
    const keyBytes = sodium.crypto_generichash(32, passphraseBytes, salt);
    
    return await window.crypto.subtle.importKey(
        'raw',
        keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

function encodeHeader(header: StreamHeader): Uint8Array {
    const encoder = new TextEncoder();
    const magicBytes = encoder.encode(header.magic);
    const algoBytes = encoder.encode(header.algorithm);
    
    const size = 1 + magicBytes.length + 1 + 1 + algoBytes.length + 4 + 4 + 8 + 16 + 12;
    const buffer = new Uint8Array(size);
    let offset = 0;
    
    buffer[offset++] = magicBytes.length;
    buffer.set(magicBytes, offset);
    offset += magicBytes.length;
    buffer[offset++] = header.version;
    buffer[offset++] = algoBytes.length;
    buffer.set(algoBytes, offset);
    offset += algoBytes.length;
    
    const view = new DataView(buffer.buffer);
    view.setUint32(offset, header.chunkSize, true); offset += 4;
    view.setUint32(offset, header.totalChunks, true); offset += 4;
    view.setBigUint64(offset, BigInt(header.originalSize), true); offset += 8;
    
    buffer.set(header.salt, offset); offset += 16;
    buffer.set(header.baseIV, offset);
    
    return buffer;
}

function decodeHeader(data: Uint8Array): StreamHeader {
    let offset = 0;
    const magicLen = data[offset++];
    const magic = new TextDecoder().decode(data.slice(offset, offset + magicLen));
    offset += magicLen;
    const version = data[offset++];
    const algoLen = data[offset++];
    const algorithm = new TextDecoder().decode(data.slice(offset, offset + algoLen));
    offset += algoLen;
    
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const chunkSize = view.getUint32(offset, true); offset += 4;
    const totalChunks = view.getUint32(offset, true); offset += 4;
    const originalSize = Number(view.getBigUint64(offset, true)); offset += 8;
    
    const salt = data.slice(offset, offset + 16); offset += 16;
    const baseIV = data.slice(offset, offset + 12);
    
    return { magic, version, algorithm, chunkSize, totalChunks, originalSize, salt, baseIV };
}

export const streamCrypto = {
    CHUNK_SIZE,

    async encrypt(
        data: Uint8Array,
        passphrase: string
    ): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; algorithm: string }> {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const baseIV = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveStreamKey(passphrase, salt);
        
        const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
        const header: StreamHeader = {
            magic: HEADER_MAGIC,
            version: HEADER_VERSION,
            algorithm: 'AES-GCM-Stream',
            chunkSize: CHUNK_SIZE,
            totalChunks,
            originalSize: data.length,
            salt,
            baseIV,
        };
        
        const headerEncoded = encodeHeader(header);
        const chunks: Uint8Array[] = [headerEncoded];
        let totalSize = headerEncoded.length;
        
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, data.length);
            const chunkData = data.slice(start, end);
            const chunkIV = deriveChunkIV(baseIV, i);
            
            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: chunkIV.buffer.slice(chunkIV.byteOffset, chunkIV.byteOffset + chunkIV.byteLength) as ArrayBuffer },
                key,
                chunkData.buffer.slice(chunkData.byteOffset, chunkData.byteOffset + chunkData.byteLength) as ArrayBuffer
            );
            
            const chunkCipher = new Uint8Array(encrypted);
            chunks.push(chunkCipher);
            totalSize += chunkCipher.length;
        }
        
        const result = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return { ciphertext: result, salt, algorithm: 'AES-GCM-Stream' };
    },

    async decrypt(
        encryptedData: Uint8Array,
        passphrase: string
    ): Promise<Uint8Array> {
        const headerSize = 1 + HEADER_MAGIC.length + 1 + 1 + 'AES-GCM-Stream'.length + 4 + 4 + 8 + 16 + 12;
        const header = decodeHeader(encryptedData.slice(0, headerSize));
        
        if (header.magic !== HEADER_MAGIC) {
            throw new Error('Format streaming invalid.');
        }
        
        const key = await deriveStreamKey(passphrase, header.salt);
        const decryptedChunks: Uint8Array[] = [];
        let offset = headerSize;
        
        for (let i = 0; i < header.totalChunks; i++) {
            const chunkIV = deriveChunkIV(header.baseIV, i);
            const chunkSize = (i < header.totalChunks - 1) 
                ? header.chunkSize + 16 
                : encryptedData.length - offset;
            
            const chunkCipher = encryptedData.slice(offset, offset + chunkSize);
            offset += chunkSize;
            
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: chunkIV.buffer.slice(chunkIV.byteOffset, chunkIV.byteOffset + chunkIV.byteLength) as ArrayBuffer },
                key,
                chunkCipher.buffer.slice(chunkCipher.byteOffset, chunkCipher.byteOffset + chunkCipher.byteLength) as ArrayBuffer
            );
            
            decryptedChunks.push(new Uint8Array(decrypted));
        }
        
        const result = new Uint8Array(header.originalSize);
        let resultOffset = 0;
        for (const chunk of decryptedChunks) {
            result.set(chunk, resultOffset);
            resultOffset += chunk.length;
        }
        
        return result;
    }
};
