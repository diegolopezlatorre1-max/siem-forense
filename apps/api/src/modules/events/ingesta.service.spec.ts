import type { EventoIngesta } from '@siem/shared';
import type { Queue } from 'bullmq';
import { QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { ConflictoError } from '../../common/errors/dominio.js';
import type { JobEvaluar } from '../detection/cola.js';
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
  const encolados: { datos: JobEvaluar; jobId?: string }[] = [];
  const eventos: EventosRepository = {
    insertar: async (e) => {
      if (opciones.duplicado) throw new QueryFailedError('INSERT', [], Object.assign(new Error('dup'), { code: '23505' }));
      guardados.push(e);
      return 7;
    },
    recientes: async () => [],
  };
  const cola = {
    add: async (_nombre: string, datos: JobEvaluar, opts?: { jobId?: string }) => {
      if (opciones.redisCaido) throw new Error('Stream isn\'t writeable');
      encolados.push({ datos, jobId: opts?.jobId });
    },
  } as unknown as Queue<JobEvaluar>;
  return { servicio: new IngestaService(eventos, cola), guardados, encolados };
}

describe('IngestaService', () => {
  it('guarda el evento con su agente y encola la evaluación de su tipo', async () => {
    const { servicio, guardados, encolados } = crear();
    expect(await servicio.ingestar(EVENTO, 3)).toEqual({ id: 7 });
    expect(guardados[0]).toMatchObject({ agente_id: 3, ts: new Date(EVENTO.ts) });
    expect(encolados[0]?.datos.eventType).toBe('login_failed');
    expect(encolados[0]?.jobId).toMatch(/^evaluar-reglas-login_failed-\d+$/);
  });

  it('un event_id repetido es un ConflictoError (409)', async () => {
    await expect(crear({ duplicado: true }).servicio.ingestar(EVENTO, 3)).rejects.toThrow(ConflictoError);
  });

  it('si Redis está caído el evento igual queda guardado', async () => {
    const { servicio, guardados } = crear({ redisCaido: true });
    expect(await servicio.ingestar(EVENTO, 3)).toEqual({ id: 7 });
    expect(guardados).toHaveLength(1);
  });
});
