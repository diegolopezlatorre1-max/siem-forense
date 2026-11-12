import type { Alerta } from '@siem/shared';
import { describe, expect, it } from 'vitest';

import { agruparAlertas } from './agrupar-alertas.js';

const BASE = Date.parse('2026-11-12T10:00:00.000Z');

function alerta(id: number, minuto: number, extra: Partial<Alerta> = {}): Alerta {
  const ts = new Date(BASE + minuto * 60_000).toISOString();
  return {
    id,
    regla_id: 'LINUX-001',
    nombre: 'Fuerza bruta SSH',
    severidad: 'high',
    mitre: 'T1110',
    clave: '192.168.56.103',
    cantidad: 5,
    ts,
    creada_en: ts,
    estado: 'abierta',
    asignada_a: null,
    version: 1,
    ...extra,
  };
}

describe('agruparAlertas', () => {
  it('junta en un grupo las alertas cercanas de la misma clave', () => {
    const grupos = agruparAlertas([
      alerta(1, 0),
      alerta(2, 1, { regla_id: 'LINUX-002', severidad: 'medium', cantidad: 10 }),
      alerta(3, 2),
    ]);
    expect(grupos).toHaveLength(1);
    const [g] = grupos;
    expect(g!.reglas).toEqual(['LINUX-001', 'LINUX-002']);
    expect(g!.severidad).toBe('high');
    expect(g!.cantidadTotal).toBe(20);
    expect(g!.alertas.map((a) => a.id)).toEqual([3, 2, 1]);
    expect(g!.desde).toBe(alerta(1, 0).ts);
    expect(g!.hasta).toBe(alerta(3, 2).ts);
  });

  it('abre un grupo nuevo si pasan más de 30 min entre alertas', () => {
    const grupos = agruparAlertas([alerta(1, 0), alerta(2, 31)]);
    expect(grupos).toHaveLength(2);
    expect(grupos.map((g) => g.alertas[0]!.id)).toEqual([2, 1]);
  });

  it('separa claves distintas y ordena por el ataque más reciente', () => {
    const grupos = agruparAlertas([
      alerta(1, 0, { clave: '10.0.0.1' }),
      alerta(2, 5, { clave: '10.0.0.2' }),
      alerta(3, 1, { clave: '10.0.0.1' }),
    ]);
    expect(grupos.map((g) => g.clave)).toEqual(['10.0.0.2', '10.0.0.1']);
  });

  it('calcula el estado común o mixto', () => {
    expect(agruparAlertas([alerta(1, 0), alerta(2, 1)])[0]!.estado).toBe('abierta');
    expect(agruparAlertas([alerta(1, 0), alerta(2, 1, { estado: 'cerrada' })])[0]!.estado).toBeNull();
  });

  it('mantiene el id del grupo al llegar una alerta más reciente', () => {
    const antes = agruparAlertas([alerta(1, 0), alerta(2, 1)])[0]!.id;
    const despues = agruparAlertas([alerta(3, 2), alerta(1, 0), alerta(2, 1)])[0]!.id;
    expect(despues).toBe(antes);
  });

  it('toma la severidad máxima del grupo', () => {
    const g = agruparAlertas([alerta(1, 0, { severidad: 'low' }), alerta(2, 1, { severidad: 'critical' })])[0]!;
    expect(g.severidad).toBe('critical');
  });
});
