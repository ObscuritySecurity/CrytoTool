
import { ensureInit, aes_gcm_encrypt, aes_gcm_decrypt } from '../crypto-core/index';
import { deriveKey, bytesToBase64, base64ToBytes } from './keyWrapping';

let inited = false;
async function initOnce() {
  if (!inited) { await ensureInit(); inited = true; }
}

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

export async function hashPin(pin: string): Promise<string> {
  await initOnce();
  const pinSalt = crypto.getRandomValues(new Uint8Array(16));
  const pinKey = await deriveKey(pin, pinSalt, 'pin');

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode('CrytoTool PIN v2');

  const ciphertext = aes_gcm_encrypt(plaintext, pinKey, nonce);

  return JSON.stringify({
    pinSalt: bytesToBase64(pinSalt),
    nonce: bytesToBase64(nonce),
    encryptedHash: bytesToBase64(ciphertext),
  });
}

export async function verifyPin(pin: string, storedValue: string): Promise<boolean> {
  await initOnce();
  let parsed: { pinSalt?: string; nonce?: string; encryptedHash?: string };
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    return false;
  }
  if (!parsed.pinSalt || !parsed.nonce || !parsed.encryptedHash) return false;

  const pinSalt = base64ToBytes(parsed.pinSalt);
  const nonce = base64ToBytes(parsed.nonce);
  const encryptedHash = base64ToBytes(parsed.encryptedHash);

  const pinKey = await deriveKey(pin, pinSalt, 'pin');

  try {
    const decrypted = aes_gcm_decrypt(encryptedHash, pinKey, nonce);
    const plaintext = new TextDecoder().decode(decrypted);
    return timingSafeEqual(plaintext, 'CrytoTool PIN v2');
  } catch {
    return false;
  }
}
