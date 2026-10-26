import { z } from 'zod';

import { SeveridadSchema } from './comunes.js';

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
});
export type Alerta = z.infer<typeof AlertaSchema>;

export const AlertasQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(50),
});
export type AlertasQuery = z.infer<typeof AlertasQuerySchema>;
