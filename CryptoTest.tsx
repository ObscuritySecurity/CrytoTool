import { useEffect, useState } from 'react';
import { ensureInit, aes_gcm_encrypt, aes_gcm_decrypt } from './crypto-core/index';

export default function CryptoTest() {
  const [status, setStatus] = useState('initializing...');

  useEffect(() => {
    (async () => {
      try {
        await ensureInit();
        setStatus('WASM loaded, running test...');

        const key = new Uint8Array(32).fill(42);
        const nonce = new Uint8Array(12).fill(7);
        const plaintext = new TextEncoder().encode('Hello from Rust crypto!');

        const ciphertext = aes_gcm_encrypt(plaintext, key, nonce);
        const decrypted = aes_gcm_decrypt(ciphertext, key, nonce);

        const decoded = new TextDecoder().decode(decrypted);
        if (decoded === 'Hello from Rust crypto!') {
          setStatus('PASS: AES-GCM roundtrip works');
        } else {
          setStatus(`FAIL: got "${decoded}"`);
        }
      } catch (err) {
        setStatus(`ERROR: ${err}`);
      }
    })();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] glass-card rounded-xl px-4 py-2 text-xs">
      <span className={status.startsWith('PASS') ? 'text-green-400' : status.startsWith('ERROR') ? 'text-red-400' : 'text-yellow-400'}>
        {status}
      </span>
    </div>
  );
}
