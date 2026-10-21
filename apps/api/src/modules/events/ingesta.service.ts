import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EventoIngesta, IngestaRespuesta } from '@siem/shared';
import type { Queue } from 'bullmq';
import { QueryFailedError } from 'typeorm';

import { correlationIdActual } from '../../common/contexto.js';
import { ConflictoError } from '../../common/errors/dominio.js';
import { COLA_DETECCION, JOB_EVALUAR, type JobEvaluar, jobIdEvaluar } from '../detection/cola.js';
import { EVENTOS_REPO, type EventosRepository } from './eventos.repository.js';

const esDuplicado = (e: unknown): boolean =>
  e instanceof QueryFailedError && (e.driverError as { code?: unknown } | undefined)?.code === '23505';

@Injectable()
export class IngestaService {
  private readonly logger = new Logger(IngestaService.name);

  constructor(
    @Inject(EVENTOS_REPO) private readonly eventos: EventosRepository,
    @InjectQueue(COLA_DETECCION) private readonly cola: Queue<JobEvaluar>,
  ) {}

  async ingestar(evento: EventoIngesta, agenteId: number | undefined): Promise<IngestaRespuesta> {
    let id: number;
    try {
      id = await this.eventos.insertar({
        ...evento,
        ts: new Date(evento.ts),
        usuario: evento.usuario ?? null,
        src_ip: evento.src_ip ?? null,
        agente_id: agenteId ?? null,
      });
    } catch (e) {
      if (esDuplicado(e)) throw new ConflictoError('Evento ya recibido', 'event_id repetido');
      throw e;
    }

    await this.encolar(evento.event_type);
    return { id };
  }

  // Si Redis no está, el evento ya quedó guardado: el worker reevalúa la ventana al arrancar (ADR 0004).
  private async encolar(eventType: EventoIngesta['event_type']): Promise<void> {
    try {
      await this.cola.add(
        JOB_EVALUAR,
        { eventType, correlationId: correlationIdActual() },
        { jobId: jobIdEvaluar(eventType), delay: 1000 },
      );
    } catch (err) {
      this.logger.warn({ err }, 'No se pudo encolar la evaluación de reglas');
    }
  }
}
