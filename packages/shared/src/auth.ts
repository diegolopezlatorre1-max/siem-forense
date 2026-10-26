import { z } from 'zod';

import { RolSchema } from './comunes.js';

export const LoginSchema = z
  .object({
    usuario: z.string().min(1).max(60),
    clave: z.string().min(1).max(200),
  })
  .strict();
export type Login = z.infer<typeof LoginSchema>;

export const UsuarioPublicoSchema = z.object({
  id: z.number().int(),
  usuario: z.string(),
  rol: RolSchema,
});
export type UsuarioPublico = z.infer<typeof UsuarioPublicoSchema>;

export const LoginRespuestaSchema = z.object({
  accessToken: z.string(),
  usuario: UsuarioPublicoSchema,
});
export type LoginRespuesta = z.infer<typeof LoginRespuestaSchema>;

export const RefreshRespuestaSchema = z.object({ accessToken: z.string() });
export type RefreshRespuesta = z.infer<typeof RefreshRespuestaSchema>;
