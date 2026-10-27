import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '@siem/shared';

import { AgentKeyGuard } from './agent-key.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { RequestAutenticada } from './jwt-auth.guard.js';
import { AGENTE_KEY, PUBLICO, ROLES } from '../auth/decoradores.js';
import { AccesoDenegadoError } from '../errors/dominio.js';

// Guard global, denegado por defecto: una ruta sin @Publico/@AgenteKey/@Roles responde 403.
@Injectable()
export class AccesoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtAuthGuard,
    private readonly agentKey: AgentKeyGuard,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const ref = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO, ref)) return true;
    if (this.reflector.getAllAndOverride<boolean>(AGENTE_KEY, ref)) return this.agentKey.canActivate(ctx);

    await this.jwt.canActivate(ctx); // valida el Bearer y pone req.usuario, o lanza 401
    const roles = this.reflector.getAllAndOverride<Rol[]>(ROLES, ref);
    const req = ctx.switchToHttp().getRequest<RequestAutenticada>();
    if (!roles?.length || !req.usuario || !roles.includes(req.usuario.rol)) {
      throw new AccesoDenegadoError('No tienes permiso para esta acción');
    }
    return true;
  }
}
