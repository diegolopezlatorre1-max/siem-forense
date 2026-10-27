import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import type { RequestAutenticada } from '../guards/jwt-auth.guard.js';

// Cuenta por usuario (si hay sesión), por agente (en /ingest) o por IP; en login, por IP + usuario.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const r = req as unknown as RequestAutenticada & { agenteId?: number; body?: { usuario?: string } };
    if (r.usuario) return Promise.resolve(`u:${r.usuario.sub}`);
    if (r.agenteId) return Promise.resolve(`a:${r.agenteId}`);
    const ip = r.ip ?? 'desconocida';
    return Promise.resolve(r.body?.usuario ? `ip:${ip}:${r.body.usuario}` : `ip:${ip}`);
  }
}
