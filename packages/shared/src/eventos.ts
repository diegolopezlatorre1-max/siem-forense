import { z } from 'zod';

import { SeveridadSchema, TipoEventoSchema } from './comunes.js';

// Mismos campos que envía el agente Python (agents/linux).
export const EventoIngestaSchema = z.object({
  event_id: z.string().min(1).max(64),
  ts: z.iso.datetime({ offset: true }),
  host: z.string().min(1).max(120),
  source: z.string().min(1).max(60),
  event_type: TipoEventoSchema,
  usuario: z.string().max(120).nullish(),
  src_ip: z.union([z.ipv4(), z.ipv6()]).nullish(),
  severity: SeveridadSchema.default('low'),
  raw: z.string().min(1).max(8192),
});
export type EventoIngesta = z.infer<typeof EventoIngestaSchema>;

export const IngestaRespuestaSchema = z.object({ id: z.number().int() });
export type IngestaRespuesta = z.infer<typeof IngestaRespuestaSchema>;
