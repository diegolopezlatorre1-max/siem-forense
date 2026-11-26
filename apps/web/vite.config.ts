import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';

// En desarrollo, /api va a la API Nest (mismo origen: la cookie de refresh es SameSite=Strict).
// API_TARGET permite apuntar a la API de la VM Ubuntu desde el PC (ver apps/web/.env.local).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_TARGET ?? 'http://localhost:3000';

  return {
    plugins: [vue()],
    server: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  };
});
