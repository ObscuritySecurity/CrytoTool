
import { argon2id } from 'hash-wasm';
import { cryptoService } from './crypto';
import { getArgonParams } from './platform';
import { deriveKey, bytesToBase64, base64ToBytes } from './keyWrapping';

// Security baseline helpers
// - The following common PINs should be deprecated and avoided in production.
export const COMMON_PINS = [
  '123456', '000000', '111111', '123123', '654321', 
  '555555', '666666', '222222', '333333', '444444',
  '777777', '888888', '999999', '121212', '101010',
  '202020', '696969', '112233', '123321', '000001'
];

export const validatePin = (pin: string): { valid: boolean; error?: string } => {
  if (pin.length !== 6) return { valid: false, error: 'PIN must have 6 digits.' };
  if (!/^\d+$/.test(pin)) return { valid: false, error: 'PIN must contain only digits.' };
  if (COMMON_PINS.includes(pin)) return { valid: false, error: 'This PIN is too common. Choose another one.' };
  
  const isSequential = '0123456789012345'.includes(pin) || '9876543210987654'.includes(pin);
  if (isSequential) return { valid: false, error: 'Simple sequences are not allowed.' };

  return { valid: true };
};

export const getBackoffTime = (failedAttempts: number): number => {
  if (failedAttempts < 3) return 0;
  if (failedAttempts === 3) return 30;
  if (failedAttempts === 4) return 60;
  if (failedAttempts >= 5) return 300;
  return 0;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
}

async function derivePinHashArgon2id(pin: string, salt: Uint8Array): Promise<string> {
  const { iterations, memorySize, parallelism } = await getArgonParams();
  const hash = await argon2id({
    password: pin,
    salt,
    iterations,
    memorySize,
    parallelism,
    hashLength: 32,
    outputType: 'binary',
  }) as Uint8Array;
  return bytesToHex(hash);
}

async function derivePinHashLegacy(pin: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(hashBuffer));
}

export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
  }
  return diff === 0;
}

/**
 * Hash PIN with PIN Key — completely independent of Vault Key.
 * PIN ──Argon2id(2 iter, 32MB)──> PIN Key ──AES-GCM──> encrypted verifier
 * No MVK dependency. PIN can be verified even when vault is locked.
 */
export async function hashPin(pin: string): Promise<string> {
  const pinSalt = window.crypto.getRandomValues(new Uint8Array(16));
  const pinKey = await deriveKey(pin, pinSalt, 'pin');

  const nonce = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const plaintext = encoder.encode('CrytoTool PIN v2');

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource },
    pinKey,
    plaintext as BufferSource
  );

  return JSON.stringify({
    pinSalt: bytesToBase64(pinSalt),
    nonce: bytesToBase64(nonce),
    encryptedHash: bytesToBase64(new Uint8Array(ciphertext)),
  });
}

/**
 * Verify a PIN against stored value.
 * Supports:
 *   1. New PIN-independent format (pinSalt + nonce + encryptedHash)
 *   2. Old MVK-dependent format ({ iv, data })
 *   3. Legacy plaintext Argon2id (a2:salt:hash)
 *   4. Legacy plaintext PBKDF2 (salt:hash)
 */
export async function verifyPin(pin: string, storedValue: string): Promise<boolean> {
  // --- 1. New format: PIN-independent (PIN Key) ---
  try {
    const parsed = JSON.parse(storedValue);
    if (parsed.pinSalt && parsed.nonce && parsed.encryptedHash) {
      const pinSalt = base64ToBytes(parsed.pinSalt);
      const nonce = base64ToBytes(parsed.nonce);
      const encryptedHash = base64ToBytes(parsed.encryptedHash);

      const pinKey = await deriveKey(pin, pinSalt, 'pin');

      try {
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: nonce as BufferSource },
          pinKey,
          encryptedHash as BufferSource
        );
        const decoder = new TextDecoder();
        const plaintext = decoder.decode(decrypted);
        return timingSafeEqual(plaintext, 'CrytoTool PIN v2');
      } catch {
        return false;
      }
    }
  } catch {
    // not JSON → continue to legacy
  }

  // --- 2. Old format: MVK-encrypted (needs vault unlocked) ---
  try {
    const parsed = JSON.parse(storedValue);
    if (parsed.iv && parsed.data) {
      let storedCombined: string;
      try {
        storedCombined = await cryptoService.decryptString(parsed.data, parsed.iv);
      } catch {
        return false;
      }
      const parts = storedCombined.split(':');
      if (parts[0] === 'a2' && parts.length === 3) {
        const salt = hexToBytes(parts[1]);
        const newHashHex = await derivePinHashArgon2id(pin, salt);
        return timingSafeEqual(parts[2], newHashHex);
      }
      return false;
    }
  } catch {
    // not JSON → continue
  }

  // --- 3. Legacy plaintext Argon2id (a2:saltHex:hashHex) ---
  const parts = storedValue.split(':');
  if (parts.length >= 3 && parts[0] === 'a2') {
    try {
      const salt = hexToBytes(parts[1]);
      const newHashHex = await derivePinHashArgon2id(pin, salt);
      return timingSafeEqual(parts[2], newHashHex);
    } catch {
      return false;
    }
  }

  // --- 4. Legacy plaintext PBKDF2 (saltHex:hashHex) ---
  if (parts.length === 2) {
    try {
      const salt = hexToBytes(parts[0]);
      const newHashHex = await derivePinHashLegacy(pin, salt);
      return timingSafeEqual(parts[1], newHashHex);
    } catch {
      return false;
    }
  }

  return false;
}
