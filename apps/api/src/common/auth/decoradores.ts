import { type CustomDecorator, SetMetadata } from '@nestjs/common';
import type { Rol } from '@siem/shared';

// Metadatos que lee AccesoGuard (RBAC, denegado por defecto).
export const PUBLICO = 'auth:publico';
export const AGENTE_KEY = 'auth:agente_key';
export const ROLES = 'auth:roles';

/** Ruta abierta: sin token (login, refresh, health). */
export const Publico = (): CustomDecorator => SetMetadata(PUBLICO, true);

/** Ruta de agente: se autentica con X-Agent-Key, no con JWT de usuario. */
export const AgenteKey = (): CustomDecorator => SetMetadata(AGENTE_KEY, true);

/** Roles permitidos. Una ruta protegida sin @Roles responde 403. */
export const Roles = (...roles: Rol[]): CustomDecorator => SetMetadata(ROLES, roles);

/** Cualquier usuario autenticado, sea cual sea su rol. */
export const Autenticado = (): CustomDecorator => SetMetadata(ROLES, ['admin', 'analista', 'auditor'] satisfies Rol[]);
