import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const https = fs.existsSync('key.pem') && fs.existsSync('cert.pem')
  ? { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }
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
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
