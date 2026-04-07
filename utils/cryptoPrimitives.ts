
import sodium from 'libsodium-wrappers';
// Crypto Primitives Notes:
// - These are the isolated building blocks used by the high-level EncryptionService.
// - They intentionally avoid cross-cutting dependencies to make auditing straightforward.

/**
 * ==============================================================================
 * CRYPTO PRIMITIVES MODULE
 * ==============================================================================
 * Acest fișier conține implementările pure ale algoritmilor de criptare.
 * Scop: Izolare pentru audit de securitate.
 * 
 * Dependențe: 
 * - Web Crypto API (Nativ) pentru AES
 * - Libsodium (WASM) pentru ChaCha20/Poly1305 și Salsa20
 */

// Ensure sodium is loaded before direct calls.
const sodiumReady = sodium.ready;

// Helper for TypeScript compatibility with WebCrypto
function toBufferSource(arr: Uint8Array): BufferSource {
    return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

/**
 * 1. AES-GCM (Galois/Counter Mode)
 * Standard: NIST SP 800-38D
 * Securitate: Autentificat (Confidențialitate + Integritate)
 * IV: 12 bytes (96 biți) recomandat
 */
export const aesGcm = {
    encrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw', toBufferSource(key), { name: 'AES-GCM' }, false, ['encrypt']
        );
        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: toBufferSource(iv) }, cryptoKey, toBufferSource(data)
        );
        return new Uint8Array(encrypted);
    },
    decrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw', toBufferSource(key), { name: 'AES-GCM' }, false, ['decrypt']
        );
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: toBufferSource(iv) }, cryptoKey, toBufferSource(data)
        );
        return new Uint8Array(decrypted);
    }
};

/**
 * 2. AES-CTR (Counter Mode) + HMAC-SHA256 (Encrypt-then-MAC)
 * Standard: NIST SP 800-38A + RFC 2104
 * Securitate: Confidențialitate + Integritate/Autentificare
 * IV: 16 bytes (Counter block)
 * Format output: ciphertext || HMAC_TAG (32 bytes)
 * 
 * Derivă 2 chei din cheia de 32 bytes prin HKDF-like:
 *   - encryptionKey (32 bytes) pentru AES-CTR
 *   - macKey (32 bytes) pentru HMAC-SHA256
 */

async function hkdfSha256(ikm: Uint8Array, info: string): Promise<Uint8Array> {
    const extractKey = await window.crypto.subtle.importKey(
        'raw', toBufferSource(ikm), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const prk = await window.crypto.subtle.sign('HMAC', extractKey, new Uint8Array(32));
    
    const expandKey = await window.crypto.subtle.importKey(
        'raw', new Uint8Array(prk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const infoBytes = new Uint8Array([...new TextEncoder().encode(info), 0x01]);
    const okm = await window.crypto.subtle.sign('HMAC', expandKey, toBufferSource(infoBytes));
    return new Uint8Array(okm);
}

async function computeHmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw', toBufferSource(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    return new Uint8Array(await window.crypto.subtle.sign('HMAC', cryptoKey, toBufferSource(data)));
}

export const aesCtr = {
    encrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
        const encryptionKey = await hkdfSha256(key, 'aes-ctr-encryption');
        const macKey = await hkdfSha256(key, 'hmac-authentication');
        
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw', toBufferSource(encryptionKey), { name: 'AES-CTR' }, false, ['encrypt']
        );
        const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-CTR', counter: toBufferSource(iv), length: 64 }, cryptoKey, toBufferSource(data)
        );
        
        const tag = await computeHmac(macKey, new Uint8Array(ciphertext));
        
        const result = new Uint8Array(ciphertext.byteLength + tag.byteLength);
        result.set(new Uint8Array(ciphertext), 0);
        result.set(tag, ciphertext.byteLength);
        return result;
    },
    decrypt: async (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> => {
        const encryptionKey = await hkdfSha256(key, 'aes-ctr-encryption');
        const macKey = await hkdfSha256(key, 'hmac-authentication');
        
        const tag = data.slice(-32);
        const ciphertext = data.slice(0, -32);
        
        const expectedTag = await computeHmac(macKey, ciphertext);
        
        if (tag.length !== expectedTag.length) throw new Error('MAC verification failed');
        
        let diff = 0;
        for (let i = 0; i < tag.length; i++) {
            diff |= tag[i] ^ expectedTag[i];
        }
        if (diff !== 0) throw new Error('MAC verification failed');
        
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw', toBufferSource(encryptionKey), { name: 'AES-CTR' }, false, ['decrypt']
        );
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-CTR', counter: toBufferSource(iv), length: 64 }, cryptoKey, toBufferSource(ciphertext)
        );
        return new Uint8Array(decrypted);
    }
};

/**
 * 3. ChaCha20-Poly1305 (IETF)
 * Standard: RFC 8439
 * Securitate: Autentificat, Rapid pe mobile (software)
 * IV: 12 bytes (96 biți)
 */
export const chacha20Poly1305 = {
    encrypt: (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array => {
        return sodium.crypto_aead_chacha20poly1305_ietf_encrypt(data, null, null, iv, key);
    },
    decrypt: (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array => {
        return sodium.crypto_aead_chacha20poly1305_ietf_decrypt(null, data, null, iv, key);
    }
};

/**
 * 4. XChaCha20-Poly1305
 * Varianta "Extended Nonce" a lui ChaCha20.
 * Securitate: Elimină riscul de coliziune a IV-ului random.
 * IV: 24 bytes (192 biți)
 */
export const xChacha20Poly1305 = {
    encrypt: (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array => {
        return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(data, null, null, iv, key);
    },
    decrypt: (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array => {
        return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, data, null, iv, key);
    }
};

/**
 * 5. Salsa20-Poly1305 (XSalsa20)
 * Implementat via `crypto_secretbox` din Libsodium.
 * Este algoritmul original rapid de la DJB.
 * IV: 24 bytes (192 biți)
 */
export const salsa20Poly1305 = {
    encrypt: (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array => {
        return sodium.crypto_secretbox_easy(data, iv, key);
    },
    decrypt: (data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array => {
        return sodium.crypto_secretbox_open_easy(data, iv, key);
    }
};

// Mapare lungimi IV necesare per algoritm.
// Hardcoded values to avoid async initialization issues (undefined constants) with libsodium.
export const IV_LENGTHS: Record<string, number> = {
    'AES-GCM': 12,
    'AES-CTR': 16,
    'ChaCha20-Poly1305': 12,
    'XChaCha20-Poly1305': 24,
    'Salsa20-Poly1305': 24
};
