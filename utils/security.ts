
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
  
  // Check simple sequences (e.g., 123456)
  const isSequential = '0123456789012345'.includes(pin) || '9876543210987654'.includes(pin);
  if (isSequential) return { valid: false, error: 'Simple sequences are not allowed.' };

  return { valid: true };
};

export const getBackoffTime = (failedAttempts: number): number => {
  if (failedAttempts < 3) return 0;
  if (failedAttempts === 3) return 30; // 30 seconds
  if (failedAttempts === 4) return 60; // 1 minute
  if (failedAttempts >= 5) return 300; // 5 minutes
  return 0;
};

const PIN_PBKDF2_ITERATIONS = 100000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
}

async function derivePinHash(pin: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PIN_PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(hashBuffer));
}

function timingSafeEqual(a: string, b: string): boolean {
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
 * Hash PIN with PBKDF2-SHA256 + random salt for secure storage.
 * Returns format: "saltHex:hashHex" encrypted with Vault Key.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await derivePinHash(pin, salt);
  const saltHex = bytesToHex(salt);
  const combined = `${saltHex}:${hashHex}`;
  
  // Encrypt the combined salt+hash with Vault Key before storing
  try {
    const encrypted = await cryptoService.encryptString(combined);
    return JSON.stringify({ iv: encrypted.iv, data: encrypted.ciphertext });
  } catch {
    throw new Error('Vault not initialized. Cannot store PIN securely.');
  }
}

/**
 * Verify a PIN by comparing the hash with the stored one.
 * Handles both encrypted and legacy plaintext formats.
 * Uses timing-safe comparison to prevent side-channel attacks.
 */
export async function verifyPin(pin: string, storedValue: string): Promise<boolean> {
  let storedCombined: string;
  
  // Check if stored value is encrypted (new format)
  try {
    const parsed = JSON.parse(storedValue);
    if (parsed.iv && parsed.data) {
      storedCombined = await cryptoService.decryptString(parsed.data, parsed.iv);
    } else {
      storedCombined = storedValue; // Legacy plaintext
    }
  } catch {
    storedCombined = storedValue; // Legacy plaintext
  }
  
  // Parse salt:hash format
  const parts = storedCombined.split(':');
  if (parts.length !== 2) return false;
  
  const [saltHex, storedHashHex] = parts;
  let salt: Uint8Array;
  try {
    salt = hexToBytes(saltHex);
  } catch {
    return false; // Legacy format without salt
  }
  
  const newHashHex = await derivePinHash(pin, salt);
  
  // Timing-safe comparison
  return timingSafeEqual(storedHashHex, newHashHex);
}
