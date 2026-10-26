import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { contexto } from '../contexto.js';

export const CABECERA_CORRELACION = 'x-correlation-id';

// Se registra con app.use() en main.ts para que corra antes que pino-http.
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const recibido = req.header(CABECERA_CORRELACION);
  const correlationId = z.uuid().safeParse(recibido).success && recibido ? recibido : randomUUID();
  req.headers[CABECERA_CORRELACION] = correlationId;
  res.setHeader(CABECERA_CORRELACION, correlationId);
  contexto.run({ correlationId }, next);
}
