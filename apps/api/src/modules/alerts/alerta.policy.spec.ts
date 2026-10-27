import { describe, expect, it } from 'vitest';

import type { ClaimsAcceso } from '../auth/tokens.service.js';
import { alertaPuedeAsignar, alertaPuedeModificar } from './alerta.policy.js';

const admin: ClaimsAcceso = { sub: 1, rol: 'admin', sid: 's' };
const ana: ClaimsAcceso = { sub: 2, rol: 'analista', sid: 's' };
const otro: ClaimsAcceso = { sub: 3, rol: 'analista', sid: 's' };
const auditor: ClaimsAcceso = { sub: 4, rol: 'auditor', sid: 's' };

describe('alertaPuedeModificar', () => {
  it('el admin siempre puede', () => {
    expect(alertaPuedeModificar(admin, { asignada_a: 2 })).toBe(true);
    expect(alertaPuedeModificar(admin, { asignada_a: null })).toBe(true);
  });

  it('el analista solo si la alerta es suya', () => {
    expect(alertaPuedeModificar(ana, { asignada_a: 2 })).toBe(true);
    expect(alertaPuedeModificar(ana, { asignada_a: 3 })).toBe(false);
    expect(alertaPuedeModificar(ana, { asignada_a: null })).toBe(false);
  });

  it('el auditor nunca puede', () => {
    expect(alertaPuedeModificar(auditor, { asignada_a: 4 })).toBe(false);
  });
});

describe('alertaPuedeAsignar', () => {
  it('el admin asigna a cualquiera; el analista solo a sí mismo', () => {
    expect(alertaPuedeAsignar(admin, 3)).toBe(true);
    expect(alertaPuedeAsignar(ana, 2)).toBe(true);
    expect(alertaPuedeAsignar(ana, 3)).toBe(false);
    expect(alertaPuedeAsignar(otro, 3)).toBe(true);
  });
});
