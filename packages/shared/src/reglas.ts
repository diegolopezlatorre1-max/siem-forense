import { z } from 'zod';

import { SeveridadSchema, TipoEventoSchema } from './comunes.js';

// Formato de rules/*.yml (ver docs/09-deteccion-y-forense.md).
export const ReglaSchema = z.object({
  id: z.string().regex(/^[A-Z]+-\d{3}$/),
  nombre: z.string().min(1).max(100),
  descripcion: z.string().optional(),
  event_type: TipoEventoSchema,
  // Si se indica, la regla solo mira eventos de ese origen (auth.log, windows-security...).
  // Evita que una fuerza bruta en Windows dispare también las reglas de Linux.
  source: z.string().min(1).max(60).optional(),
  agrupar_por: z.enum(['src_ip', 'usuario', 'host']),
  umbral: z.number().int().min(1),
  ventana_segundos: z.number().int().min(1),
  severidad: SeveridadSchema,
  mitre: z.string().regex(/^T\d{4}(\.\d{3})?$/),
});
export type Regla = z.infer<typeof ReglaSchema>;
