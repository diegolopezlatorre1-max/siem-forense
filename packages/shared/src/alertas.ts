import { z } from 'zod';

import { SeveridadSchema } from './comunes.js';

// Estados del flujo de triage (ver docs/07-datos.md).
export const EstadoAlertaSchema = z.enum(['abierta', 'en_progreso', 'cerrada', 'falso_positivo']);
export type EstadoAlerta = z.infer<typeof EstadoAlertaSchema>;

export const AlertaSchema = z.object({
  id: z.number().int(),
  regla_id: z.string(),
  nombre: z.string(),
  severidad: SeveridadSchema,
  mitre: z.string(),
  clave: z.string(),
  cantidad: z.number().int(),
  ts: z.iso.datetime({ offset: true }),
  creada_en: z.iso.datetime({ offset: true }),
  estado: EstadoAlertaSchema,
  asignada_a: z.number().int().nullable(),
  version: z.number().int(),
});
export type Alerta = z.infer<typeof AlertaSchema>;

export const AlertasQuerySchema = z.object({
  estado: EstadoAlertaSchema.optional(),
  severidad: SeveridadSchema.optional(),
  regla_id: z.string().min(1).max(30).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(50),
});
export type AlertasQuery = z.infer<typeof AlertasQuerySchema>;

// Cuerpo de POST /alerts/:id/asignar. `version` es la que vio el cliente (bloqueo optimista).
export const AsignarAlertaSchema = z.object({
  usuarioId: z.number().int().positive(),
  version: z.number().int().min(1),
});
export type AsignarAlerta = z.infer<typeof AsignarAlertaSchema>;

// Cuerpo de PATCH /alerts/:id.
export const CambiarEstadoAlertaSchema = z.object({
  estado: EstadoAlertaSchema,
  version: z.number().int().min(1),
});
export type CambiarEstadoAlerta = z.infer<typeof CambiarEstadoAlertaSchema>;
