import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { ClaimsAcceso } from '../../modules/auth/tokens.service.js';
import type { RequestAutenticada } from '../guards/jwt-auth.guard.js';

// Claims del access token que validó JwtAuthGuard.
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): ClaimsAcceso | undefined =>
    ctx.switchToHttp().getRequest<RequestAutenticada>().usuario,
);
