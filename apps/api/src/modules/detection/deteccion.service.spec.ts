import type { Regla } from '@siem/shared';
import type { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it } from 'vitest';

import type { AlertasRepository } from '../alerts/alertas.repository.js';
import type { EventosRepository } from '../events/eventos.repository.js';
import { DeteccionService } from './deteccion.service.js';
import type { AlertaNueva, EventoEvaluable } from './engine.js';

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
const AHORA = new Date('2026-10-21T12:00:00Z');

function crear(eventosGuardados: EventoEvaluable[]) {
  const alertas: AlertaNueva[] = [];
  const eventos: EventosRepository = {
    insertar: async () => 0,
    recientes: async (tipo, desde) =>
      eventosGuardados.filter((e) => e.event_type === tipo && e.ts.getTime() >= desde.getTime()),
    listar: async () => [[], 0],
  };
  const repoAlertas: AlertasRepository = {
    listar: async () => [[], 0],
    buscarPorId: async () => null,
    actualizarConVersion: async () => null,
    existeDesde: async (regla, clave, desde) =>
      alertas.some((a) => a.regla_id === regla && a.clave === clave && a.ts.getTime() >= desde.getTime()),
    insertar: async (a) => {
      alertas.push(a);
      return true;
    },
  };
  const ds = {
    transaction: (trabajo: (em: EntityManager) => Promise<void>) => trabajo({} as EntityManager),
  } as unknown as DataSource;
  return { servicio: new DeteccionService([REGLA], eventos, repoAlertas, ds), alertas };
}

const rafaga = (ip: string, n: number, inicioMs: number): EventoEvaluable[] =>
  Array.from({ length: n }, (_, i) => ({ event_type: 'login_failed', src_ip: ip, ts: new Date(inicioMs + i * 1000) }));

describe('DeteccionService', () => {
  it('crea la alerta de una ráfaga reciente', async () => {
    const { servicio, alertas } = crear(rafaga('10.0.0.1', 5, AHORA.getTime() - 30_000));
    expect(await servicio.evaluarTipo('login_failed', AHORA)).toBe(1);
    expect(alertas[0]).toMatchObject({ regla_id: 'LINUX-001', clave: '10.0.0.1', cantidad: 5 });
  });

  it('no duplica la alerta al reevaluar la misma ventana (reintentos del worker)', async () => {
    const { servicio, alertas } = crear(rafaga('10.0.0.1', 5, AHORA.getTime() - 30_000));
    await servicio.evaluarTipo('login_failed', AHORA);
    expect(await servicio.evaluarTipo('login_failed', AHORA)).toBe(0);
    expect(alertas).toHaveLength(1);
  });

  it('ignora eventos más viejos que 10 ventanas', async () => {
    const { servicio } = crear(rafaga('10.0.0.1', 5, AHORA.getTime() - 11 * 60_000));
    expect(await servicio.evaluarTipo('login_failed', AHORA)).toBe(0);
  });

  it('no evalúa reglas de otro tipo de evento', async () => {
    const { servicio } = crear(rafaga('10.0.0.1', 5, AHORA.getTime() - 30_000));
    expect(await servicio.evaluarTipo('login_success', AHORA)).toBe(0);
  });
});
