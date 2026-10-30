import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { cargarRegla, cargarReglas, ReglaInvalidaError } from './rules.loader.js';

const REGLAS = fileURLToPath(new URL('../../../../../rules', import.meta.url));

// Mismos casos que el antiguo tests/test_reglas.py (backend Python, retirado).
describe('cargador de reglas', () => {
  it('carga la regla de fuerza bruta', async () => {
    const ids = (await cargarReglas(REGLAS)).map((r) => r.id);
    expect(ids).toContain('LINUX-001');
  });

  it('carga las 6 reglas del repo y todas indican su origen', async () => {
    const reglas = await cargarReglas(REGLAS);
    expect(reglas.map((r) => r.id).sort()).toEqual(['LINUX-001', 'LINUX-002', 'LINUX-003', 'LINUX-004', 'WIN-001', 'WIN-002']);
    expect(reglas.filter((r) => r.id.startsWith('WIN-')).every((r) => r.source === 'windows-security')).toBe(true);
    expect(reglas.filter((r) => r.id.startsWith('LINUX-')).every((r) => r.source === 'auth.log')).toBe(true);
  });

  it('rechaza una regla incompleta indicando el archivo', async () => {
    const carpeta = await mkdtemp(join(tmpdir(), 'reglas-'));
    const archivo = join(carpeta, 'mala.yml');
    await writeFile(archivo, 'id: X\n');
    await expect(cargarRegla(archivo)).rejects.toThrow(ReglaInvalidaError);
    await expect(cargarRegla(archivo)).rejects.toThrow(/mala\.yml/);
  });
});
