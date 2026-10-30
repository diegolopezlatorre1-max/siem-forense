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

// Sesión 27: reglas de Windows y filtro por origen.
const WIN_001: Regla = {
  id: 'WIN-001',
  nombre: 'Fuerza bruta en Windows',
  event_type: 'login_failed',
  source: 'windows-security',
  agrupar_por: 'src_ip',
  umbral: 5,
  ventana_segundos: 60,
  severidad: 'high',
  mitre: 'T1110',
};
const WIN_002: Regla = {
  id: 'WIN-002',
  nombre: 'Creación de usuario local',
  event_type: 'user_created',
  source: 'windows-security',
  agrupar_por: 'host',
  umbral: 1,
  ventana_segundos: 60,
  severidad: 'high',
  mitre: 'T1136.001',
};

const deOrigen = (source: string, ip: string, segundo: number): EventoEvaluable => ({
  ...evento(ip, segundo),
  source,
});

describe('evaluar con source', () => {
  it('WIN-001 alerta con 5 fallos 4625 desde la misma IP', () => {
    const alertas = evaluar(WIN_001, Array.from({ length: 5 }, (_, i) => deOrigen('windows-security', '192.168.56.103', i * 5)));
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ regla_id: 'WIN-001', clave: '192.168.56.103', cantidad: 5 });
  });

  it('WIN-001 ignora los fallos de auth.log', () => {
    expect(evaluar(WIN_001, Array.from({ length: 5 }, (_, i) => deOrigen('auth.log', '10.0.0.1', i)))).toEqual([]);
  });

  it('una regla con source no mezcla orígenes para llegar al umbral', () => {
    const mezcla = [
      ...Array.from({ length: 3 }, (_, i) => deOrigen('windows-security', '10.0.0.1', i)),
      ...Array.from({ length: 3 }, (_, i) => deOrigen('auth.log', '10.0.0.1', i + 3)),
    ];
    expect(evaluar(WIN_001, mezcla)).toEqual([]);
  });

  it('LINUX-001 con source auth.log ignora la fuerza bruta de Windows', () => {
    const linux: Regla = { ...REGLA, source: 'auth.log' };
    expect(evaluar(linux, Array.from({ length: 5 }, (_, i) => deOrigen('windows-security', '10.0.0.1', i)))).toEqual([]);
  });

  it('WIN-002 alerta con una sola creación de usuario, agrupada por host', () => {
    const creado: EventoEvaluable = {
      event_type: 'user_created',
      source: 'windows-security',
      host: 'WIN10',
      usuario: 'backdoor',
      ts: new Date(INICIO),
    };
    const alertas = evaluar(WIN_002, [creado]);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ regla_id: 'WIN-002', clave: 'WIN10', cantidad: 1, mitre: 'T1136.001' });
  });
});
