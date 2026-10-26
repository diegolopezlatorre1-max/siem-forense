import { AsyncLocalStorage } from 'node:async_hooks';

// Contexto por petición o por job: lo leen los logs y el productor de la cola.
export interface Contexto {
  correlationId: string;
}

export const contexto = new AsyncLocalStorage<Contexto>();

export const correlationIdActual = (): string | undefined => contexto.getStore()?.correlationId;
