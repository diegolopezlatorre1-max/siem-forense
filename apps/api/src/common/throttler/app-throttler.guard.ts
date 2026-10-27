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
    let ip = 'desconocida';
    try {
      if (typeof r.ip === 'string') ip = r.ip;
    } catch {
      // req.ip puede fallar si el socket aún no está listo; usamos el valor por defecto.
    }
    return Promise.resolve(r.body?.usuario ? `ip:${ip}:${r.body.usuario}` : `ip:${ip}`);
  }
}
