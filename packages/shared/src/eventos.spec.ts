import { describe, expect, it } from 'vitest';

import { EventoIngestaSchema } from './eventos.js';

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
});
