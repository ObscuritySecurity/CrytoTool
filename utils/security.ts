import {
  pin_hash,
  pin_verify,
  validate_pin as wasmValidatePin,
  get_backoff_time,
} from '../crypto-core/index';
import type { ArgonPurpose } from '../types';

function getArgonParams(purpose: ArgonPurpose, isMobile: boolean) {
  const map: Record<string, { iterations: number; memory: number; parallelism: number }> = {
    pin: { iterations: 2, memory: 32768, parallelism: 4 },
    recovery: { iterations: isMobile ? 2 : 10, memory: isMobile ? 65536 : 131072, parallelism: 4 },
    master: { iterations: isMobile ? 3 : 19, memory: isMobile ? 65536 : 131072, parallelism: 4 },
  };
  return map[purpose];
}

export async function hashPin(pin: string, purpose: ArgonPurpose = 'pin', isMobile = false): Promise<string> {
  const params = getArgonParams(purpose, isMobile);
  return pin_hash(pin, params.iterations, params.memory, params.parallelism);
}

export async function verifyPin(pin: string, stored: string, purpose: ArgonPurpose = 'pin', isMobile = false): Promise<boolean> {
  const params = getArgonParams(purpose, isMobile);
  return pin_verify(pin, stored, params.iterations, params.memory, params.parallelism);
}

export function validatePin(pin: string): { valid: boolean; error?: string } {
  try {
    wasmValidatePin(pin);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: String(e) };
  }
}

export function getBackoffTime(attempts: number): number {
  return get_backoff_time(attempts);
}

export function timingSafeEqual(a: string | Uint8Array, b: string | Uint8Array): boolean {
  const enc = new TextEncoder();
  const ab = typeof a === 'string' ? enc.encode(a) : a;
  const bb = typeof b === 'string' ? enc.encode(b) : b;
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}
