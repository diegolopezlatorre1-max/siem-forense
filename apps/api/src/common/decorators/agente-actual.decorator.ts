import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestDeAgente } from '../guards/agent-key.guard.js';

// Id del agente que autenticó AgentKeyGuard.
export const AgenteActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): number | undefined =>
    ctx.switchToHttp().getRequest<RequestDeAgente>().agenteId,
);
