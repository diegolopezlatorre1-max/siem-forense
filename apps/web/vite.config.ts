import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// En desarrollo, /api va a la API Nest (mismo origen: la cookie de refresh es SameSite=Strict).
export default defineConfig({
  plugins: [vue()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
