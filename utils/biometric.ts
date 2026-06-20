const BIOMETRIC_ENABLED_KEY = 'crytotool_biometric_enabled';
const BIOMETRIC_AVAILABLE_KEY = 'crytotool_biometric_available';

function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
}
function setBiometricEnabled(val: boolean): void {
  if (val) localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
  else localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
}
function isBiometricAvailable(): boolean {
  return localStorage.getItem(BIOMETRIC_AVAILABLE_KEY) === 'true';
}
function setBiometricAvailable(val: boolean): void {
  if (val) localStorage.setItem(BIOMETRIC_AVAILABLE_KEY, 'true');
  else localStorage.removeItem(BIOMETRIC_AVAILABLE_KEY);
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

async function androidAuthenticate(reason: string): Promise<boolean> {
  if (!isAndroid()) return true;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('authenticate_biometric', { reason });
  } catch {
    return false;
  }
}

export async function checkBiometricAvailability(): Promise<{
  available: boolean; biometryType?: string; error?: string;
}> {
  if (!isTauri()) {
    setBiometricAvailable(false);
    return { available: false, error: 'Not in Tauri context' };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const available = await invoke<boolean>('check_biometric_availability');
    setBiometricAvailable(available);
    return { available, biometryType: available ? (isAndroid() ? 'Biometric Prompt' : 'Platform Keychain') : undefined };
  } catch {
    setBiometricAvailable(false);
    return { available: false, error: 'Biometric check failed' };
  }
}

export async function storeMasterKeyBiometric(masterKeyBytes: Uint8Array): Promise<boolean> {
  if (!isTauri()) return false;
  const auth = await androidAuthenticate('Enable biometric unlock');
  if (!auth) return false;
  try {
    const { setPassword } = await import('tauri-plugin-keyring-api');
    let binary = '';
    for (let i = 0; i < masterKeyBytes.length; i++) binary += String.fromCharCode(masterKeyBytes[i]);
    const b64 = btoa(binary);
    await setPassword('com.crytotool.vault', 'master_key', b64);
    setBiometricEnabled(true);
    return true;
  } catch {
    return false;
  }
}

export async function retrieveMasterKeyBiometric(): Promise<Uint8Array | null> {
  if (!isTauri()) return null;
  const auth = await androidAuthenticate('Unlock your encrypted vault');
  if (!auth) return null;
  try {
    const { getPassword } = await import('tauri-plugin-keyring-api');
    const b64 = await getPassword('com.crytotool.vault', 'master_key');
    if (!b64) return null;
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function hasBiometricKey(): Promise<boolean> {
  return isBiometricEnabled();
}

export async function removeBiometricKey(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { deletePassword } = await import('tauri-plugin-keyring-api');
    await deletePassword('com.crytotool.vault', 'master_key');
    setBiometricEnabled(false);
    return true;
  } catch {
    return false;
  }
}

export {
  isBiometricEnabled, setBiometricEnabled, isBiometricAvailable, setBiometricAvailable,
};
