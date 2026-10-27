import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { EventoIngesta, IngestaRespuesta } from '@siem/shared';
import type { Queue } from 'bullmq';
import { DataSource, QueryFailedError } from 'typeorm';

import { correlationIdActual } from '../../common/contexto.js';
import { ConflictoError } from '../../common/errors/dominio.js';
import { COLA_DETECCION, JOB_EVALUAR, type JobEvaluar, jobIdEvaluar } from '../detection/cola.js';
import { ForenseService } from '../forensics/forense.service.js';
import { EVENTOS_REPO, type EventosRepository } from './eventos.repository.js';

const esDuplicado = (e: unknown): boolean =>
  e instanceof QueryFailedError && (e.driverError as { code?: unknown } | undefined)?.code === '23505';

@Injectable()
export class IngestaService {
  private readonly logger = new Logger(IngestaService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject(EVENTOS_REPO) private readonly eventos: EventosRepository,
    private readonly forense: ForenseService,
    @InjectQueue(COLA_DETECCION) private readonly cola: Queue<JobEvaluar>,
  ) {}

  async ingestar(evento: EventoIngesta, agenteId: number | undefined): Promise<IngestaRespuesta> {
    let resultado: IngestaRespuesta;
    try {
      // Guardar el evento y sellar su eslabón en una sola transacción (docs/09).
      resultado = await this.ds.transaction(async (em) => {
        const id = await this.eventos.insertar(
          {
            ...evento,
            ts: new Date(evento.ts),
            usuario: evento.usuario ?? null,
            src_ip: evento.src_ip ?? null,
            agente_id: agenteId ?? null,
          },
          em,
        );
        const secuencia = await this.forense.sellar(em, {
          id,
          event_id: evento.event_id,
          ts: evento.ts,
          host: evento.host,
          source: evento.source,
          event_type: evento.event_type,
          usuario: evento.usuario ?? null,
          src_ip: evento.src_ip ?? null,
          severity: evento.severity,
          raw: evento.raw,
        });
        return { id, secuencia };
      });
    } catch (e) {
      if (esDuplicado(e)) throw new ConflictoError('Evento ya recibido', 'event_id repetido');
      throw e;
    }

    await this.encolar(evento.event_type);
    return resultado;
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
