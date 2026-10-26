import type { TipoEvento } from '@siem/shared';

export const COLA_DETECCION = 'deteccion';
export const JOB_EVALUAR = 'evaluar-reglas';

export interface JobEvaluar {
  eventType: TipoEvento;
  correlationId?: string;
}

// Un job por tipo y por segundo: una ráfaga de 100 eventos produce una sola evaluación.
// BullMQ no admite ':' en los ids propios.
export const jobIdEvaluar = (eventType: TipoEvento, ahora = Date.now()): string =>
  `${JOB_EVALUAR}-${eventType}-${Math.floor(ahora / 1000)}`;
