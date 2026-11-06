import { describe, expect, it } from 'vitest';

import { EventoIngestaSchema } from './eventos.js';
import { LineaTiempoQuerySchema } from './linea-tiempo.js';

const valido = {
  event_id: 'a'.repeat(32),
  ts: '2026-10-14T00:42:32.536944-05:00',
  host: 'ubuntu',
  source: 'auth.log',
  event_type: 'login_failed',
  usuario: 'intruso',
  src_ip: '192.168.56.103',
  severity: 'medium',
  raw: 'Failed password for invalid user intruso',
};

describe('EventoIngestaSchema', () => {
  it('acepta lo que envía el agente Linux', () => {
    expect(EventoIngestaSchema.parse(valido).event_type).toBe('login_failed');
  });

  it('usa severity low por defecto', () => {
    const { severity: _s, ...sinSeveridad } = valido;
    expect(EventoIngestaSchema.parse(sinSeveridad).severity).toBe('low');
  });

  it('rechaza una IP inválida y un tipo desconocido', () => {
    expect(EventoIngestaSchema.safeParse({ ...valido, src_ip: 'no-ip' }).success).toBe(false);
    expect(EventoIngestaSchema.safeParse({ ...valido, event_type: 'otro' }).success).toBe(false);
  });

  it('acepta lo que envía el agente Windows (ts UTC con milisegundos, sin IP)', () => {
    const windows = {
      ...valido,
      ts: '2026-10-30T16:45:00.123Z',
      host: 'WIN10',
      source: 'windows-security',
      event_type: 'user_created',
      usuario: 'backdoor',
      src_ip: null,
      severity: 'high',
    };
    expect(EventoIngestaSchema.parse(windows).source).toBe('windows-security');
  });
});

describe('LineaTiempoQuerySchema', () => {
  const rango = { desde: '2026-10-30T00:00:00Z', hasta: '2026-10-31T00:00:00Z' };

  it('acepta un sujeto y un rango', () => {
    expect(LineaTiempoQuerySchema.parse({ ...rango, src_ip: '192.168.56.103' }).desde).toBeInstanceOf(Date);
  });

  it('exige al menos host, usuario o src_ip', () => {
    expect(LineaTiempoQuerySchema.safeParse(rango).success).toBe(false);
  });

  it('rechaza un rango invertido', () => {
    expect(LineaTiempoQuerySchema.safeParse({ host: 'WIN10', desde: rango.hasta, hasta: rango.desde }).success).toBe(false);
  });
});
