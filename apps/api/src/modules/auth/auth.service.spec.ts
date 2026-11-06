import { randomUUID } from 'node:crypto';

import { hash } from 'argon2';
import { beforeEach, describe, expect, it } from 'vitest';

import { NoAutenticadoError } from '../../common/errors/dominio.js';
import type { ConfigService } from '../../config/config.service.js';
import { AuthService } from './auth.service.js';
import type { RefreshTokenEntity } from './refresh-token.entity.js';
import type { NuevoRefresh, RefreshTokensRepository } from './refresh-tokens.repository.js';
import type { CacheSesiones } from './sesiones.cache.js';
import { TokensService } from './tokens.service.js';
import type { UsuarioEntity } from './usuario.entity.js';
import type { UsuariosRepository } from './usuarios.repository.js';

const CTX = { ip: '127.0.0.1', userAgent: 'test' };
const CLAVE = 'contraseña-correcta';

const config = {
  get: (k: string) =>
    ({ SECRETO_JWT: 'secreto-de-pruebas-con-mas-de-32-bytes!!', ACCESS_TTL_SEG: 600, MAX_SESIONES: 2, REFRESH_TTL_DIAS: 7 })[k],
} as unknown as ConfigService;

class FakeUsuarios implements UsuariosRepository {
  constructor(public lista: UsuarioEntity[]) {}
  async buscarActivoPorNombre(n: string) {
    return this.lista.find((u) => u.usuario === n && u.activo) ?? null;
  }
  async buscarPorId(id: number) {
    return this.lista.find((u) => u.id === id) ?? null;
  }
  async listar() {
    return this.lista;
  }
  async crear(datos: { usuario: string; clave_hash: string; rol: UsuarioEntity['rol'] }) {
    const u = { id: this.lista.length + 1, activo: true, creado_en: new Date(), ...datos } as UsuarioEntity;
    this.lista.push(u);
    return u;
  }
}

class FakeRefresh implements RefreshTokensRepository {
  filas: RefreshTokenEntity[] = [];
  async crear(d: NuevoRefresh) {
    this.filas.push({ id: randomUUID(), usado_en: null, revocado_en: null, ...d } as RefreshTokenEntity);
  }
  async buscarPorHash(h: string) {
    return this.filas.find((f) => f.token_hash === h) ?? null;
  }
  async marcarUsado(id: string) {
    const f = this.filas.find((x) => x.id === id);
    if (!f || f.usado_en) return false;
    f.usado_en = new Date();
    return true;
  }
  async revocarFamilia(fam: string) {
    for (const f of this.filas) if (f.familia_id === fam && !f.revocado_en) f.revocado_en = new Date();
  }
  async revocarPorUsuario(u: number) {
    for (const f of this.filas) if (f.usuario_id === u && !f.revocado_en) f.revocado_en = new Date();
  }
  async familiasActivasOrdenadas(u: number) {
    const min = new Map<string, number>();
    for (const f of this.filas)
      if (f.usuario_id === u && !f.revocado_en) {
        const t = f.expira_en.getTime();
        if (!min.has(f.familia_id) || t < (min.get(f.familia_id) as number)) min.set(f.familia_id, t);
      }
    return [...min.entries()].sort((a, b) => a[1] - b[1]).map((e) => e[0]);
  }
  async familiaTieneActivo(fam: string) {
    return this.filas.some((f) => f.familia_id === fam && !f.revocado_en);
  }
}

class FakeCache implements CacheSesiones {
  m = new Map<string, boolean>();
  async activa(sid: string) {
    return this.m.has(sid) ? (this.m.get(sid) as boolean) : null;
  }
  async guardar(sid: string, a: boolean) {
    this.m.set(sid, a);
  }
  async invalidar(sid: string) {
    this.m.delete(sid);
  }
}

let usuarios: FakeUsuarios;
let refresh: FakeRefresh;
let tokens: TokensService;
let servicio: AuthService;

beforeEach(async () => {
  const u = { id: 1, usuario: 'ana', clave_hash: await hash(CLAVE), rol: 'analista', activo: true } as UsuarioEntity;
  usuarios = new FakeUsuarios([u]);
  refresh = new FakeRefresh();
  tokens = new TokensService(config);
  servicio = new AuthService(usuarios, refresh, new FakeCache(), tokens, config);
});

describe('AuthService', () => {
  it('rechaza credenciales inválidas', async () => {
    await expect(servicio.login({ usuario: 'ana', clave: 'mala' }, CTX)).rejects.toThrow(NoAutenticadoError);
    await expect(servicio.login({ usuario: 'nadie', clave: CLAVE }, CTX)).rejects.toThrow(NoAutenticadoError);
  });

  it('el login emite un access válido y guarda el refresh de la familia', async () => {
    const r = await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    const claims = await tokens.verificarAccess(r.accessToken);
    expect(claims.sub).toBe(1);
    expect(claims.rol).toBe('analista');
    expect(refresh.filas).toHaveLength(1);
    expect(refresh.filas.map((f) => f.familia_id)).toEqual([claims.sid]);
    expect(refresh.filas.map((f) => f.token_hash)).toEqual([tokens.hash(r.refreshToken)]);
  });

  it('respeta el máximo de sesiones revocando la más antigua', async () => {
    await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX); // la 3.ª (MAX=2) revoca la 1.ª
    expect(await refresh.familiasActivasOrdenadas(1)).toHaveLength(2);
  });

  it('el refresh rota el token manteniendo la familia', async () => {
    const login = await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    const familia = (await tokens.verificarAccess(login.accessToken)).sid;
    const r = await servicio.refrescar(login.refreshToken, CTX);
    expect(r.refreshToken).not.toBe(login.refreshToken);
    expect((await tokens.verificarAccess(r.accessToken)).sid).toBe(familia);
    expect(refresh.filas).toHaveLength(2);
    const original = refresh.filas.find((f) => f.token_hash === tokens.hash(login.refreshToken));
    expect(original?.usado_en).toBeInstanceOf(Date); // el original quedó usado
  });

  it('reutilizar un refresh ya usado (fuera de la gracia) revoca la familia', async () => {
    const login = await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    const familia = (await tokens.verificarAccess(login.accessToken)).sid;
    await servicio.refrescar(login.refreshToken, CTX);
    // Simula que el robo ocurre mucho después de la rotación.
    const original = refresh.filas.find((f) => f.token_hash === tokens.hash(login.refreshToken));
    if (!original) throw new Error('falta el refresh original');
    original.usado_en = new Date(Date.now() - 60_000);
    await expect(servicio.refrescar(login.refreshToken, CTX)).rejects.toThrow(/reutilizado/);
    expect(await servicio.familiaActiva(familia)).toBe(false);
  });

  it('dos refresh casi simultáneos: el segundo da 401 sin revocar la familia', async () => {
    const login = await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    const familia = (await tokens.verificarAccess(login.accessToken)).sid;
    await servicio.refrescar(login.refreshToken, CTX);
    await expect(servicio.refrescar(login.refreshToken, CTX)).rejects.toThrow(/ya usado/);
    expect(await servicio.familiaActiva(familia)).toBe(true);
  });

  it('logout revoca la familia y logout-all todas las del usuario', async () => {
    const login = await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    const familia = (await tokens.verificarAccess(login.accessToken)).sid;
    await servicio.logout(familia);
    expect(await servicio.familiaActiva(familia)).toBe(false);

    await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    await servicio.login({ usuario: 'ana', clave: CLAVE }, CTX);
    await servicio.logoutAll(1);
    expect(await refresh.familiasActivasOrdenadas(1)).toHaveLength(0);
  });

  it('un refresh inexistente es inválido', async () => {
    await expect(servicio.refrescar('no-existe', CTX)).rejects.toThrow(NoAutenticadoError);
  });
});
