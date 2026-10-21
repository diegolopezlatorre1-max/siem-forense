import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC emite la metadata de decoradores que necesita la inyección de Nest.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: { include: ['src/**/*.spec.ts'] },
});
