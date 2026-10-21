import { z } from 'zod';

export const SeveridadSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Severidad = z.infer<typeof SeveridadSchema>;

export const TipoEventoSchema = z.enum(['login_failed', 'login_success', 'user_created']);
export type TipoEvento = z.infer<typeof TipoEventoSchema>;

export const RolSchema = z.enum(['admin', 'analista', 'auditor']);
export type Rol = z.infer<typeof RolSchema>;
