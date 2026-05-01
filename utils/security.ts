
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

/**
 * Hash PIN with SHA-256 + salt for secure storage in localStorage.
 * We never store the PIN in plain text.
 * Now encrypted with Vault Key before storing.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = 'crytotool_vault_pin_salt_v1';
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Encrypt the hash with Vault Key before storing
  try {
    const encrypted = await cryptoService.encryptString(hashHex);
    return JSON.stringify({ iv: encrypted.iv, data: encrypted.ciphertext });
  } catch {
    // If Vault Key not available, return plaintext (fallback for setup)
    return hashHex;
  }
}

/**
 * Verify a PIN by comparing the hash with the stored one.
 * Handles both encrypted and legacy plaintext formats.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  let hash: string;
  
  // Check if stored hash is encrypted (new format)
  try {
    const parsed = JSON.parse(storedHash);
    if (parsed.iv && parsed.data) {
      hash = await cryptoService.decryptString(parsed.data, parsed.iv);
    } else {
      hash = storedHash; // Legacy plaintext
    }
  } catch {
    hash = storedHash; // Legacy plaintext
  }
  
  const newHash = await hashPin(pin);
  // If newHash is encrypted, compare encrypted forms
  if (newHash.startsWith('{')) {
    let diff = 0;
    if (newHash.length !== storedHash.length) return false;
    for (let i = 0; i < newHash.length; i++) {
      diff |= newHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return diff === 0;
  }
  
  // Compare plaintext hashes
  let diff = 0;
  if (hash.length !== newHash.length) return false;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ newHash.charCodeAt(i);
  }
  return diff === 0;
}
