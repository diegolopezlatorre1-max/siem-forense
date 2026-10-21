import { describe, expect, it } from 'vitest';

import { generarLlave, prefijoDe } from './llave.js';

describe('llave de agente', () => {
  it('el prefijo se puede recuperar de la llave generada', () => {
    const { llave, prefijo } = generarLlave();
    expect(prefijoDe(llave)).toBe(prefijo);
  });

  it('rechaza llaves con otro formato', () => {
    expect(prefijoDe('cualquier-cosa')).toBeNull();
    expect(prefijoDe(`${generarLlave().llave}x`)).toBeNull();
  });
});
