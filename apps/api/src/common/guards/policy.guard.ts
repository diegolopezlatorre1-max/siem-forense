import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { ClaimsAcceso } from '../../modules/auth/tokens.service.js';
import { AccesoDenegadoError, NoEncontradoError } from '../errors/dominio.js';
import type { RequestAutenticada } from './jwt-auth.guard.js';

// ABAC (ownership): carga el recurso y decide con una función pura (usuario, recurso) => boolean.
export interface Politica<R> {
  cargar(ctx: ExecutionContext): Promise<R | null>;
  permitir(usuario: ClaimsAcceso, recurso: R): boolean;
}

export const POLITICA = 'auth:politica';

/** Ej.: @CheckPolicy(alertaPolicy). Se evalúa después del RBAC. */
export const CheckPolicy = <R>(p: Politica<R>) => SetMetadata(POLITICA, p);

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const pol = this.reflector.get<Politica<unknown>>(POLITICA, ctx.getHandler());
    if (!pol) return true;

    const req = ctx.switchToHttp().getRequest<RequestAutenticada>();
    const recurso = await pol.cargar(ctx);
    if (recurso === null) throw new NoEncontradoError('Recurso no encontrado');
    if (!req.usuario || !pol.permitir(req.usuario, recurso)) {
      throw new AccesoDenegadoError('No autorizado sobre este recurso');
    }
    return true;
  }
}
