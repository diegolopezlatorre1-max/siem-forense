import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { contexto } from '../../common/contexto.js';
import { COLA_DETECCION, type JobEvaluar } from './cola.js';
import { DeteccionService } from './deteccion.service.js';

@Processor(COLA_DETECCION)
export class DeteccionProcessor extends WorkerHost {
  private readonly logger = new Logger(DeteccionProcessor.name);

  constructor(private readonly deteccion: DeteccionService) {
    super();
  }

  // El correlationId de la ingesta que originó el job sigue en los logs del worker.
  process(job: Job<JobEvaluar>): Promise<{ nuevas: number }> {
    const correlationId = job.data.correlationId ?? `job-${job.id}`;
    return contexto.run({ correlationId }, async () => {
      const nuevas = await this.deteccion.evaluarTipo(job.data.eventType);
      this.logger.log({ eventType: job.data.eventType, nuevas }, 'deteccion.evaluada');
      return { nuevas };
    });
  }
}
