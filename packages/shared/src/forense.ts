import { z } from 'zod';

export const MotivoForenseSchema = z.enum([
  'evento_alterado', // el hash recalculado no coincide con el guardado
  'cadena_rota', // hash_anterior no coincide con el eslabón previo
  'eslabon_faltante', // hueco en la secuencia
  'evento_sin_sellar', // hay un evento sin eslabón dentro del rango sellado
]);
export type MotivoForense = z.infer<typeof MotivoForenseSchema>;

export const ForenseFalloSchema = z.object({
  secuencia: z.number().int().nullable(),
  eventoId: z.number().int().nullable(),
  motivo: MotivoForenseSchema,
});
export type ForenseFallo = z.infer<typeof ForenseFalloSchema>;

export const ForenseVerificacionSchema = z.object({
  integra: z.boolean(),
  eslabones: z.number().int(),
  primerFallo: ForenseFalloSchema.optional(),
});
export type ForenseVerificacion = z.infer<typeof ForenseVerificacionSchema>;
