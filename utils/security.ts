
// Security baseline helpers
// - The following common PINs should be deprecated and avoided in production.
export const COMMON_PINS = [
  '123456', '000000', '111111', '123123', '654321', 
  '555555', '666666', '222222', '333333', '444444',
  '777777', '888888', '999999', '121212', '101010',
  '202020', '696969', '112233', '123321', '000001'
];

export const validatePin = (pin: string): { valid: boolean; error?: string } => {
  if (pin.length !== 6) return { valid: false, error: 'PIN-ul trebuie să aibă 6 cifre.' };
  if (!/^\d+$/.test(pin)) return { valid: false, error: 'PIN-ul trebuie să conțină doar cifre.' };
  if (COMMON_PINS.includes(pin)) return { valid: false, error: 'Acest PIN este prea comun. Alege altul.' };
  
  // Verificare secvențe simple (ex: 123456)
  const isSequential = '0123456789012345'.includes(pin) || '9876543210987654'.includes(pin);
  if (isSequential) return { valid: false, error: 'Secvențele simple nu sunt permise.' };

  return { valid: true };
};

export const getBackoffTime = (failedAttempts: number): number => {
  if (failedAttempts < 3) return 0;
  if (failedAttempts === 3) return 30; // 30 secunde
  if (failedAttempts === 4) return 60; // 1 minut
  if (failedAttempts >= 5) return 300; // 5 minute
  return 0;
};

/**
 * Hash PIN cu SHA-256 + salt pentru stocare sigură în localStorage.
 * Nu stocăm niciodată PIN-ul în clar.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = 'crytotool_vault_pin_salt_v1';
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifică un PIN comparând hash-ul cu cel stocat.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  let diff = 0;
  if (hash.length !== storedHash.length) return false;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
