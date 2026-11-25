import { describe, expect, it } from 'vitest';

import { CrearUsuarioSchema, EDAD_MINIMA } from './auth.js';

const base = { usuario: 'ana', clave: 'una-clave-larga', rol: 'analista' };

describe('CrearUsuarioSchema: edad mínima', () => {
  it('acepta exactamente la edad mínima', () => {
    expect(CrearUsuarioSchema.safeParse({ ...base, edad: EDAD_MINIMA }).success).toBe(true);
  });

  it('rechaza a un menor de la edad mínima', () => {
    const r = CrearUsuarioSchema.safeParse({ ...base, edad: EDAD_MINIMA - 1 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['edad']);
  });

  it('rechaza si falta la edad, si no es entera o si viene como texto', () => {
    expect(CrearUsuarioSchema.safeParse(base).success).toBe(false);
    expect(CrearUsuarioSchema.safeParse({ ...base, edad: 20.5 }).success).toBe(false);
    expect(CrearUsuarioSchema.safeParse({ ...base, edad: '20' }).success).toBe(false);
  });
});
