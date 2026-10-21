import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { cargarRegla, cargarReglas, ReglaInvalidaError } from './rules.loader.js';

const REGLAS = fileURLToPath(new URL('../../../../../rules', import.meta.url));

// Mismos casos que tests/test_reglas.py.
describe('cargador de reglas', () => {
  it('carga la regla de fuerza bruta', async () => {
    const ids = (await cargarReglas(REGLAS)).map((r) => r.id);
    expect(ids).toContain('LINUX-001');
  });

  it('rechaza una regla incompleta indicando el archivo', async () => {
    const carpeta = await mkdtemp(join(tmpdir(), 'reglas-'));
    const archivo = join(carpeta, 'mala.yml');
    await writeFile(archivo, 'id: X\n');
    await expect(cargarRegla(archivo)).rejects.toThrow(ReglaInvalidaError);
    await expect(cargarRegla(archivo)).rejects.toThrow(/mala\.yml/);
  });
});
