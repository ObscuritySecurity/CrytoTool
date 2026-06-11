let vaultKey: Uint8Array | null = null;

export function getVaultKey(): Uint8Array {
  if (!vaultKey) throw new Error('Vault key not initialized');
  return vaultKey;
}

export function setVaultKey(key: Uint8Array | null) {
  vaultKey = key;
}
