import { LIMITE_LINEA_TIEMPO } from '@siem/shared';
import { describe, expect, it } from 'vitest';

import type { AlertaEntity } from '../alerts/alerta.entity.js';
import type { AlertasRepository } from '../alerts/alertas.repository.js';
import type { EventoEntity } from '../events/evento.entity.js';
import type { EventosRepository, FiltrosEventos } from '../events/eventos.repository.js';
import { TimelineService } from './timeline.service.js';

const evento = (id: number, ts: string, over: Partial<EventoEntity> = {}): EventoEntity => ({
  id,
  event_id: `e${id}`,
  ts: new Date(ts),
  host: 'WIN10',
  source: 'windows-security',
  event_type: 'login_failed',
  usuario: 'administrador',
  src_ip: '192.168.56.103',
  severity: 'medium',
  raw: '4625',
  recibido_en: new Date(ts),
  agente_id: 2,
  ...over,
});

const alerta = (id: number, ts: string, clave: string): AlertaEntity => ({
  id,
  regla_id: 'WIN-001',
  nombre: 'Fuerza bruta en Windows',
  severidad: 'high',
  mitre: 'T1110',
  clave,
  cantidad: 5,
  ts: new Date(ts),
  creada_en: new Date(ts),
  estado: 'abierta',
  asignada_a: null,
  version: 1,
});

// Repos falsos que devuelven filas fijas y recuerdan con qué se les llamó.
function crear(eventos: EventoEntity[], alertas: AlertaEntity[], totales = { eventos: eventos.length, alertas: alertas.length }) {
  const llamadas: { filtros?: FiltrosEventos; claves?: readonly string[] } = {};
  const repoEventos: EventosRepository = {
    insertar: async () => 0,
    recientes: async () => [],
    listar: async (filtros) => {
      llamadas.filtros = filtros;
      return [eventos, totales.eventos];
    },
  };
  const repoAlertas: AlertasRepository = {
    listar: async () => [[], 0],
    buscarPorId: async () => null,
    actualizarConVersion: async () => null,
    existeDesde: async () => false,
    insertar: async () => true,
    porClaves: async (claves) => {
      llamadas.claves = claves;
      return [alertas, totales.alertas];
    },
  };
  return { servicio: new TimelineService(repoEventos, repoAlertas), llamadas };
}

const RANGO = { desde: new Date('2026-10-30T00:00:00Z'), hasta: new Date('2026-10-31T00:00:00Z') };

describe('TimelineService', () => {
  it('mezcla eventos y alertas en orden cronológico ascendente', async () => {
    // Los repos devuelven lo más reciente primero, como en la base.
    const { servicio } = crear(
      [evento(2, '2026-10-30T16:45:04Z'), evento(1, '2026-10-30T16:45:00Z')],
      [alerta(9, '2026-10-30T16:45:02Z', '192.168.56.103')],
    );
    const { items, truncada } = await servicio.consultar({ ...RANGO, src_ip: '192.168.56.103' });
    expect(items.map((i) => `${i.tipo}@${i.ts}`)).toEqual([
      'evento@2026-10-30T16:45:00.000Z',
      'alerta@2026-10-30T16:45:02.000Z',
      'evento@2026-10-30T16:45:04.000Z',
    ]);
    expect(truncada).toBe(false);
  });

  it('a igual ts, el evento va antes que la alerta que provocó', async () => {
    const ts = '2026-10-30T16:45:00Z';
    const { servicio } = crear([evento(1, ts)], [alerta(9, ts, '192.168.56.103')]);
    const { items } = await servicio.consultar({ ...RANGO, src_ip: '192.168.56.103' });
    expect(items.map((i) => i.tipo)).toEqual(['evento', 'alerta']);
  });

  it('filtra eventos por todos los sujetos y busca alertas por cualquiera de ellos', async () => {
    const { servicio, llamadas } = crear([], []);
    await servicio.consultar({ ...RANGO, host: 'WIN10', usuario: 'backdoor' });
    expect(llamadas.filtros).toMatchObject({ host: 'WIN10', usuario: 'backdoor', src_ip: undefined, ...RANGO });
    expect(llamadas.claves).toEqual(['WIN10', 'backdoor']);
  });

  it('marca truncada si hay más filas que el límite', async () => {
    const { servicio } = crear([evento(1, '2026-10-30T16:45:00Z')], [], { eventos: LIMITE_LINEA_TIEMPO + 1, alertas: 0 });
    expect((await servicio.consultar({ ...RANGO, host: 'WIN10' })).truncada).toBe(true);
  });
});
