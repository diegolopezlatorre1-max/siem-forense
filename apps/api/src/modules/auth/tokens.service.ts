import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { Rol } from '@siem/shared';
import { SignJWT, jwtVerify } from 'jose';

import { ConfigService } from '../../config/config.service.js';

export interface ClaimsAcceso {
  sub: number; // id del usuario
  rol: Rol;
  sid: string; // familia_id de la sesión
}

// Firma/verifica el access JWT (HS256) y genera los refresh opacos.
@Injectable()
export class TokensService {
  private readonly clave: Uint8Array;
  private readonly ttlSeg: number;

  constructor(config: ConfigService) {
    this.clave = new TextEncoder().encode(config.get('SECRETO_JWT'));
    this.ttlSeg = config.get('ACCESS_TTL_SEG');
  }

  firmarAccess(c: ClaimsAcceso): Promise<string> {
    return new SignJWT({ rol: c.rol, sid: c.sid })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(c.sub))
      .setJti(randomUUID()) // cada token es único aunque se emita en el mismo segundo
      .setIssuedAt()
      .setExpirationTime(`${this.ttlSeg}s`)
      .sign(this.clave);
  }

  async verificarAccess(token: string): Promise<ClaimsAcceso> {
    const { payload } = await jwtVerify(token, this.clave, { algorithms: ['HS256'] });
    return { sub: Number(payload.sub), rol: payload.rol as Rol, sid: payload.sid as string };
  }

  /** Refresh de 32 bytes (base64url). En la base solo se guarda su hash. */
  generarRefresh(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
