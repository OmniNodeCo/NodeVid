import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    // In dev, forward API calls to the Express server (npm start on :3000).
    proxy: { '/api': 'http://localhost:3000' },
  },
});
