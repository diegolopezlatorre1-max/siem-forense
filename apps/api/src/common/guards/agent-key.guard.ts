import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { AgentesService } from '../../modules/agents/agentes.service.js';
import { NoAutenticadoError } from '../errors/dominio.js';

export type RequestDeAgente = Request & { agenteId?: number };

// Protege /ingest: solo entran agentes con una llave X-Agent-Key válida y activa.
@Injectable()
export class AgentKeyGuard implements CanActivate {
  constructor(private readonly agentes: AgentesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestDeAgente>();
    const llave = req.header('x-agent-key');
    const agenteId = llave ? await this.agentes.autenticar(llave) : null;
    if (agenteId === null) throw new NoAutenticadoError('Llave de agente inválida');
    req.agenteId = agenteId;
    return true;
  }
}
