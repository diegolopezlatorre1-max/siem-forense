import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../../modules/auth/auth.service.js';
import type { ClaimsAcceso } from '../../modules/auth/tokens.service.js';
import { TokensService } from '../../modules/auth/tokens.service.js';
import { NoAutenticadoError } from '../errors/dominio.js';

export type RequestAutenticada = Request & { usuario?: ClaimsAcceso };

// Exige un access JWT válido cuya familia no esté revocada.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestAutenticada>();
    const cabecera = req.header('authorization');
    const token = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null;
    if (!token) throw new NoAutenticadoError('Falta el token de acceso');

    let claims: ClaimsAcceso;
    try {
      claims = await this.tokens.verificarAccess(token);
    } catch {
      throw new NoAutenticadoError('Token inválido o expirado');
    }

    if (!(await this.auth.familiaActiva(claims.sid))) throw new NoAutenticadoError('Sesión revocada');
    req.usuario = claims;
    return true;
  }
}
