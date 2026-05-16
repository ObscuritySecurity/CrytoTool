/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';

const https = existsSync('key.pem') && existsSync('cert.pem')
  ? { key: readFileSync('key.pem'), cert: readFileSync('cert.pem') }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    https,
  },
  build: {
    outDir: 'dist',
  },
});
