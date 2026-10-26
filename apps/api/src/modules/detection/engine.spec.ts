import type { Regla } from '@siem/shared';
import { describe, expect, it } from 'vitest';

import { evaluar, type EventoEvaluable } from './engine.js';

// Mismos 5 casos que el antiguo tests/test_motor.py (backend Python, retirado).
const REGLA: Regla = {
  id: 'LINUX-001',
  nombre: 'Fuerza bruta SSH',
  event_type: 'login_failed',
  agrupar_por: 'src_ip',
  umbral: 5,
  ventana_segundos: 60,
  severidad: 'high',
  mitre: 'T1110',
};
const INICIO = Date.UTC(2026, 9, 14, 12, 0, 0);

const evento = (ip: string, segundo: number, tipo = 'login_failed'): EventoEvaluable => ({
  event_type: tipo,
  src_ip: ip,
  ts: new Date(INICIO + segundo * 1000),
});

describe('evaluar', () => {
  it('alerta con 5 fallos rápidos', () => {
    const alertas = evaluar(REGLA, Array.from({ length: 5 }, (_, i) => evento('10.0.0.1', i * 10)));
    expect(alertas).toHaveLength(1);
    expect(alertas[0]?.clave).toBe('10.0.0.1');
    expect(alertas[0]?.mitre).toBe('T1110');
  });

  it('no alerta si son lentos', () => {
    expect(evaluar(REGLA, Array.from({ length: 5 }, (_, i) => evento('10.0.0.1', i * 20)))).toEqual([]);
  });

  it('no alerta si son IPs distintas', () => {
    expect(evaluar(REGLA, Array.from({ length: 5 }, (_, i) => evento(`10.0.0.${i}`, i)))).toEqual([]);
  });

  it('ignora otros tipos de evento', () => {
    expect(evaluar(REGLA, Array.from({ length: 5 }, (_, i) => evento('10.0.0.1', i, 'login_success')))).toEqual([]);
  });

  it('no repite alertas', () => {
    expect(evaluar(REGLA, Array.from({ length: 10 }, (_, i) => evento('10.0.0.1', i)))).toHaveLength(2);
  });
});
