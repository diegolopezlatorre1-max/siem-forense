import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Requiere PostgreSQL y Redis (docker compose up -d) y el .env de la raíz.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: { include: ['test/**/*.e2e-spec.ts'], fileParallelism: false, testTimeout: 20000 },
});
