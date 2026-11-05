import { describe, expect, it } from 'vitest';

import { seccionesPara } from './menu.js';
import { rutas } from './rutas.js';

const titulos = (rol: Parameters<typeof seccionesPara>[1]): string[] =>
  seccionesPara(rutas, rol).map((s) => s.titulo);

describe('seccionesPara (menú por rol)', () => {
  it('el admin ve todas las secciones, incluida Usuarios, en el orden de las rutas', () => {
    expect(titulos('admin')).toEqual(['Eventos', 'Alertas', 'Línea de tiempo', 'Verificar cadena', 'Usuarios']);
  });

  it('el analista no ve Verificar cadena ni Usuarios', () => {
    expect(titulos('analista')).toEqual(['Eventos', 'Alertas', 'Línea de tiempo']);
  });

  it('el auditor ve Verificar cadena pero no Usuarios', () => {
    expect(titulos('auditor')).toEqual(['Eventos', 'Alertas', 'Línea de tiempo', 'Verificar cadena']);
  });

  it('sin sesión no hay menú, y login/403/inicio nunca aparecen', () => {
    expect(titulos(null)).toEqual([]);
    expect(seccionesPara(rutas, 'admin').map((s) => s.ruta)).not.toContain('/login');
  });
});
