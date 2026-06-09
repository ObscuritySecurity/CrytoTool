import {
  checkStatus, authenticate, setData, getData, hasData, removeData,
} from '@choochmeque/tauri-plugin-biometry-api';
import type { BiometryType } from '@choochmeque/tauri-plugin-biometry-api';

const BIOMETRIC_DOMAIN = 'com.crytotool.vault';
const BIOMETRIC_KEY_NAME = 'master_key';
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

function biometryTypeName(t: BiometryType): string {
  const names: Record<number, string> = {
    0: 'None', 1: 'Windows Hello', 2: 'Touch ID', 3: 'Face ID', 4: 'Iris',
  };
  return names[t as number] || 'Unknown';
}

export async function checkBiometricAvailability(): Promise<{
  available: boolean; biometryType?: string; error?: string;
}> {
  try {
    const status = await checkStatus();
    setBiometricAvailable(status.isAvailable);
    return {
      available: status.isAvailable,
      biometryType: status.isAvailable ? biometryTypeName(status.biometryType) : undefined,
      error: status.error,
    };
  } catch {
    setBiometricAvailable(false);
    return { available: false, error: 'Biometric check failed' };
  }
}

export async function storeMasterKeyBiometric(masterKeyBytes: Uint8Array): Promise<boolean> {
  try {
    const b64 = btoa(String.fromCharCode(...masterKeyBytes));
    await setData({ domain: BIOMETRIC_DOMAIN, name: BIOMETRIC_KEY_NAME, data: b64 });
    setBiometricEnabled(true);
    return true;
  } catch {
    return false;
  }
}

export async function retrieveMasterKeyBiometric(): Promise<Uint8Array | null> {
  try {
    const response = await getData({
      domain: BIOMETRIC_DOMAIN,
      name: BIOMETRIC_KEY_NAME,
      reason: 'Authenticate to unlock your encrypted vault',
      cancelTitle: 'Use Master Password',
    });
    const binaryStr = atob(response.data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function hasBiometricKey(): Promise<boolean> {
  try {
    return await hasData({ domain: BIOMETRIC_DOMAIN, name: BIOMETRIC_KEY_NAME });
  } catch {
    return false;
  }
}

export async function removeBiometricKey(): Promise<boolean> {
  try {
    await removeData({ domain: BIOMETRIC_DOMAIN, name: BIOMETRIC_KEY_NAME });
    setBiometricEnabled(false);
    return true;
  } catch {
    return false;
  }
}

export {
  isBiometricEnabled, setBiometricEnabled, isBiometricAvailable, setBiometricAvailable,
};
