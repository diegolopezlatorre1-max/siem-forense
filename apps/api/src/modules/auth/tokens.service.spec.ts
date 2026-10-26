import type { Rol } from '@siem/shared';
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import type { ConfigService } from '../../config/config.service.js';
import { TokensService } from './tokens.service.js';

const SECRETO = 'secreto-de-pruebas-con-mas-de-32-bytes!!';

const configCon = (ttl = 600): ConfigService =>
  ({ get: (k: string) => ({ SECRETO_JWT: SECRETO, ACCESS_TTL_SEG: ttl }) [k] }) as unknown as ConfigService;

const servicio = new TokensService(configCon());
const CLAIMS = { sub: 42, rol: 'analista' as Rol, sid: 'fam-1' };

describe('TokensService', () => {
  it('firma y verifica un access token con los mismos claims', async () => {
    const claims = await servicio.verificarAccess(await servicio.firmarAccess(CLAIMS));
    expect(claims).toEqual(CLAIMS);
  });

  it('rechaza un token manipulado', async () => {
    const token = await servicio.firmarAccess(CLAIMS);
    const roto = token.slice(0, -2) + (token.endsWith('a') ? 'b' : 'a');
    await expect(servicio.verificarAccess(roto)).rejects.toThrow();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const otro = new TokensService(
      { get: (k: string) => ({ SECRETO_JWT: 'x'.repeat(40), ACCESS_TTL_SEG: 600 })[k] } as unknown as ConfigService,
    );
    await expect(servicio.verificarAccess(await otro.firmarAccess(CLAIMS))).rejects.toThrow();
  });

  it('rechaza un token expirado', async () => {
    const vencido = await new SignJWT({ rol: 'admin', sid: 'fam-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('1')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRETO));
    await expect(servicio.verificarAccess(vencido)).rejects.toThrow();
  });

  it('genera refresh distintos con hash sha256 determinista', () => {
    const a = servicio.generarRefresh();
    const b = servicio.generarRefresh();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(servicio.hash(a.token)).toBe(a.hash);
  });
});
