import { z } from 'zod';

import { AlertaSchema } from './alertas.js';
import { EventoSchema } from './eventos.js';

// Máximo de eventos y de alertas que devuelve una consulta (cada uno por separado).
export const LIMITE_LINEA_TIEMPO = 500;

// Query de GET /timeline: al menos un sujeto (host, usuario o IP) y un rango de fechas.
export const LineaTiempoQuerySchema = z
  .object({
    host: z.string().min(1).max(120).optional(),
    usuario: z.string().min(1).max(120).optional(),
    src_ip: z.string().min(1).max(45).optional(),
    desde: z.coerce.date(),
    hasta: z.coerce.date(),
  })
  .refine((q) => q.host !== undefined || q.usuario !== undefined || q.src_ip !== undefined, {
    message: 'Indique host, usuario o src_ip',
    path: ['host'],
  })
  .refine((q) => q.desde.getTime() <= q.hasta.getTime(), {
    message: 'desde debe ser anterior a hasta',
    path: ['desde'],
  });
export type LineaTiempoQuery = z.infer<typeof LineaTiempoQuerySchema>;

// Cada elemento es un evento o una alerta; `ts` es la marca por la que se ordena.
export const ElementoLineaTiempoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('evento'), ts: z.iso.datetime({ offset: true }), evento: EventoSchema }),
  z.object({ tipo: z.literal('alerta'), ts: z.iso.datetime({ offset: true }), alerta: AlertaSchema }),
]);
export type ElementoLineaTiempo = z.infer<typeof ElementoLineaTiempoSchema>;

// Respuesta de GET /timeline, en orden cronológico ascendente. `truncada` indica que
// había más de LIMITE_LINEA_TIEMPO eventos o alertas y se devolvieron los más recientes.
export const LineaTiempoSchema = z.object({
  items: z.array(ElementoLineaTiempoSchema),
  truncada: z.boolean(),
});
export type LineaTiempo = z.infer<typeof LineaTiempoSchema>;
