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

export const IngestaRespuestaSchema = z.object({ id: z.number().int(), secuencia: z.number().int() });
export type IngestaRespuesta = z.infer<typeof IngestaRespuestaSchema>;

// Evento ya almacenado, tal como lo devuelve GET /events (fechas en ISO con zona).
export const EventoSchema = z.object({
  id: z.number().int(),
  event_id: z.string(),
  ts: z.iso.datetime({ offset: true }),
  host: z.string(),
  source: z.string(),
  event_type: TipoEventoSchema,
  usuario: z.string().nullable(),
  src_ip: z.string().nullable(),
  severity: SeveridadSchema,
  raw: z.string(),
  recibido_en: z.iso.datetime({ offset: true }),
  agente_id: z.number().int().nullable(),
});
export type Evento = z.infer<typeof EventoSchema>;

// Filtros y paginación de GET /events. Los valores llegan como texto en la query,
// por eso pagina/tamano y las fechas se coercionan.
export const EventosQuerySchema = z.object({
  host: z.string().min(1).max(120).optional(),
  usuario: z.string().min(1).max(120).optional(),
  src_ip: z.string().min(1).max(45).optional(),
  event_type: TipoEventoSchema.optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(50),
});
export type EventosQuery = z.infer<typeof EventosQuerySchema>;
