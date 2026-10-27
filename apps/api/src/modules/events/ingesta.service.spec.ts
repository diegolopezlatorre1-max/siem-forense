import type { EventoIngesta } from '@siem/shared';
import type { Queue } from 'bullmq';
import { type DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { ConflictoError } from '../../common/errors/dominio.js';
import type { JobEvaluar } from '../detection/cola.js';
import type { ForenseService } from '../forensics/forense.service.js';
import type { EventosRepository, NuevoEvento } from './eventos.repository.js';
import { IngestaService } from './ingesta.service.js';

const EVENTO: EventoIngesta = {
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

function crear(opciones: { duplicado?: boolean; redisCaido?: boolean } = {}) {
  const guardados: NuevoEvento[] = [];
  const sellados: { id: number }[] = [];
  const encolados: { datos: JobEvaluar; jobId?: string }[] = [];
  const em = {} as EntityManager;
  const ds = { transaction: async (cb: (em: EntityManager) => Promise<unknown>) => cb(em) } as unknown as DataSource;
  const eventos: EventosRepository = {
    insertar: async (e) => {
      if (opciones.duplicado) throw new QueryFailedError('INSERT', [], Object.assign(new Error('dup'), { code: '23505' }));
      guardados.push(e);
      return 7;
    },
    recientes: async () => [],
  };
  const forense = {
    sellar: async (_em: EntityManager, evento: { id: number }) => {
      sellados.push(evento);
      return 3;
    },
  } as unknown as ForenseService;
  const cola = {
    add: async (_nombre: string, datos: JobEvaluar, opts?: { jobId?: string }) => {
      if (opciones.redisCaido) throw new Error("Stream isn't writeable");
      encolados.push({ datos, jobId: opts?.jobId });
    },
  } as unknown as Queue<JobEvaluar>;
  return { servicio: new IngestaService(ds, eventos, forense, cola), guardados, sellados, encolados };
}

describe('IngestaService', () => {
  it('guarda el evento, lo sella y encola la evaluación de su tipo', async () => {
    const { servicio, guardados, sellados, encolados } = crear();
    expect(await servicio.ingestar(EVENTO, 3)).toEqual({ id: 7, secuencia: 3 });
    expect(guardados[0]).toMatchObject({ agente_id: 3, ts: new Date(EVENTO.ts) });
    expect(sellados[0]?.id).toBe(7);
    expect(encolados[0]?.datos.eventType).toBe('login_failed');
    expect(encolados[0]?.jobId).toMatch(/^evaluar-reglas-login_failed-\d+$/);
  });

  it('un event_id repetido es un ConflictoError (409)', async () => {
    await expect(crear({ duplicado: true }).servicio.ingestar(EVENTO, 3)).rejects.toThrow(ConflictoError);
  });

  it('si Redis está caído el evento igual queda guardado y sellado', async () => {
    const { servicio, guardados, sellados } = crear({ redisCaido: true });
    expect(await servicio.ingestar(EVENTO, 3)).toEqual({ id: 7, secuencia: 3 });
    expect(guardados).toHaveLength(1);
    expect(sellados).toHaveLength(1);
  });
});
