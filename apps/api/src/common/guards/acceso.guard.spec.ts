import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Rol } from '@siem/shared';
import { describe, expect, it } from 'vitest';

import { AGENTE_KEY, PUBLICO, ROLES } from '../auth/decoradores.js';
import { AccesoDenegadoError, NoAutenticadoError } from '../errors/dominio.js';
import { AccesoGuard } from './acceso.guard.js';
import type { AgentKeyGuard } from './agent-key.guard.js';
import type { JwtAuthGuard } from './jwt-auth.guard.js';

interface Opciones {
  meta?: Record<string, unknown>;
  rol?: Rol;
  jwtFalla?: boolean;
}

function crear({ meta = {}, rol, jwtFalla = false }: Opciones) {
  const req: { usuario?: { sub: number; rol: Rol; sid: string } } = {};
  const reflector = { getAllAndOverride: (clave: string) => meta[clave] } as unknown as Reflector;
  const jwt = {
    canActivate: async () => {
      if (jwtFalla) throw new NoAutenticadoError('token malo');
      if (rol) req.usuario = { sub: 1, rol, sid: 's' };
      return true;
    },
  } as unknown as JwtAuthGuard;
  const agentKey = { canActivate: async () => true } as unknown as AgentKeyGuard;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { guard: new AccesoGuard(reflector, jwt, agentKey), ctx };
}

describe('AccesoGuard', () => {
  it('deja pasar las rutas públicas sin autenticar', async () => {
    const { guard, ctx } = crear({ meta: { [PUBLICO]: true }, jwtFalla: true });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('delega las rutas de agente en AgentKeyGuard', async () => {
    const { guard, ctx } = crear({ meta: { [AGENTE_KEY]: true } });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('permite cuando el rol está en @Roles', async () => {
    const { guard, ctx } = crear({ meta: { [ROLES]: ['admin', 'analista'] }, rol: 'analista' });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('niega (403) cuando el rol no está permitido', async () => {
    const { guard, ctx } = crear({ meta: { [ROLES]: ['admin'] }, rol: 'auditor' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(AccesoDenegadoError);
  });

  it('niega (403) por defecto si la ruta no declara @Roles', async () => {
    const { guard, ctx } = crear({ meta: {}, rol: 'admin' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(AccesoDenegadoError);
  });

  it('propaga el 401 si el token es inválido', async () => {
    const { guard, ctx } = crear({ meta: { [ROLES]: ['admin'] }, jwtFalla: true });
    await expect(guard.canActivate(ctx)).rejects.toThrow(NoAutenticadoError);
  });
});
