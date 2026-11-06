import { createHmac } from 'node:crypto';

import type { DataSource } from 'typeorm';
import { describe, expect, it } from 'vitest';

import type { ConfigService } from '../../config/config.service.js';
import { type EventoSellable, ForenseService } from './forense.service.js';

const CLAVE = 'clave-forense-de-pruebas-de-32-bytes!!';
const config = { get: () => CLAVE } as unknown as ConfigService;
const servicio = new ForenseService(null as unknown as DataSource, config);

const EVENTO: EventoSellable = {
  id: 1,
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

describe('ForenseService (sellado)', () => {
  it('el génesis es HMAC(CLAVE, "GENESIS|siem-forense")', () => {
    const esperado = createHmac('sha256', CLAVE).update('GENESIS|siem-forense').digest('hex');
    expect(servicio.hashGenesis()).toBe(esperado);
  });

  it('el canónico ordena las claves y usa ts en UTC', () => {
    const c = servicio.canonico(EVENTO);
    expect(c.startsWith('{"event_id":')).toBe(true);
    expect(c).toContain('"ts":"2026-10-14T05:42:32.536Z"');
    expect(JSON.stringify(Object.keys(JSON.parse(c)))).toBe(
      JSON.stringify(['event_id', 'event_type', 'host', 'raw', 'severity', 'source', 'src_ip', 'ts', 'usuario']),
    );
  });

  it('el mismo evento con el mismo anterior da siempre el mismo sello', () => {
    const prev = servicio.hashGenesis();
    const a = servicio.hashEslabon(prev, 1, servicio.canonico(EVENTO));
    const b = servicio.hashEslabon(prev, 1, servicio.canonico(EVENTO));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('alterar el evento cambia el sello', () => {
    const prev = servicio.hashGenesis();
    const original = servicio.hashEslabon(prev, 1, servicio.canonico(EVENTO));
    const alterado = servicio.hashEslabon(prev, 1, servicio.canonico({ ...EVENTO, raw: 'otra cosa' }));
    expect(alterado).not.toBe(original);
  });
});
