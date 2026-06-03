
import { argon2id } from 'hash-wasm';
import { cryptoService } from './crypto';

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
  const hash = await argon2id({
    password: pin,
    salt,
    iterations: 19,
    memorySize: 131072,
    parallelism: 4,
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
 * Hash PIN with Argon2id + random salt.
 * Format: "a2:saltHex:hashHex" encrypted with Vault Key.
 * Uses same Argon2id parameters as the rest of the app.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await derivePinHashArgon2id(pin, salt);
  const saltHex = bytesToHex(salt);
  const combined = `a2:${saltHex}:${hashHex}`;

  try {
    const encrypted = await cryptoService.encryptString(combined);
    return JSON.stringify({ iv: encrypted.iv, data: encrypted.ciphertext });
  } catch {
    throw new Error('Vault not initialized. Cannot store PIN securely.');
  }
}

/**
 * Verify a PIN against stored value.
 * Supports both Argon2id (new, prefixed "a2:") and PBKDF2 (legacy) formats.
 */
export async function verifyPin(pin: string, storedValue: string): Promise<boolean> {
  let storedCombined: string;

  try {
    const parsed = JSON.parse(storedValue);
    if (parsed.iv && parsed.data) {
      storedCombined = await cryptoService.decryptString(parsed.data, parsed.iv);
    } else {
      storedCombined = storedValue;
    }
  } catch {
    storedCombined = storedValue;
  }

  const parts = storedCombined.split(':');
  if (parts.length < 2) return false;

  if (parts[0] === 'a2' && parts.length === 3) {
    const [_, saltHex, storedHashHex] = parts;
    let salt: Uint8Array;
    try {
      salt = hexToBytes(saltHex);
    } catch {
      return false;
    }
    const newHashHex = await derivePinHashArgon2id(pin, salt);
    return timingSafeEqual(storedHashHex, newHashHex);
  }

  if (parts.length === 2) {
    const [saltHex, storedHashHex] = parts;
    let salt: Uint8Array;
    try {
      salt = hexToBytes(saltHex);
    } catch {
      return false;
    }
    const newHashHex = await derivePinHashLegacy(pin, salt);
    return timingSafeEqual(storedHashHex, newHashHex);
  }

  return false;
}
