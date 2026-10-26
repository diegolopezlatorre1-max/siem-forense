import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Login, LoginRespuesta, UsuarioPublico } from '@siem/shared';
import { verify } from 'argon2';

import { NoAutenticadoError } from '../../common/errors/dominio.js';
import { ConfigService } from '../../config/config.service.js';
import { REFRESH_REPO, type RefreshTokensRepository } from './refresh-tokens.repository.js';
import { CACHE_SESIONES, type CacheSesiones } from './sesiones.cache.js';
import { TokensService } from './tokens.service.js';
import { USUARIOS_REPO, type UsuariosRepository } from './usuarios.repository.js';

// Gracia para rotaciones casi simultáneas (dos pestañas): dentro de ella un refresh ya
// usado responde 401 sin revocar la familia; fuera de ella se trata como robo (reutilización).
const GRACIA_MS = 10_000;

export interface Sesion {
  accessToken: string;
  refreshToken: string;
}
export type LoginConRefresh = LoginRespuesta & { refreshToken: string };

interface Contexto {
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxSesiones: number;
  private readonly refreshTtlMs: number;

  constructor(
    @Inject(USUARIOS_REPO) private readonly usuarios: UsuariosRepository,
    @Inject(REFRESH_REPO) private readonly refresh: RefreshTokensRepository,
    @Inject(CACHE_SESIONES) private readonly cache: CacheSesiones,
    private readonly tokens: TokensService,
    config: ConfigService,
  ) {
    this.maxSesiones = config.get('MAX_SESIONES');
    this.refreshTtlMs = config.get('REFRESH_TTL_DIAS') * 86_400_000;
  }

  async login(datos: Login, ctx: Contexto): Promise<LoginConRefresh> {
    const u = await this.usuarios.buscarActivoPorNombre(datos.usuario);
    if (!u || !(await verify(u.clave_hash, datos.clave))) {
      throw new NoAutenticadoError('Credenciales inválidas');
    }

    await this.aplicarLimiteSesiones(u.id);
    const familia = randomUUID();
    const refreshToken = await this.crearRefresh(u.id, familia, ctx);
    const accessToken = await this.tokens.firmarAccess({ sub: u.id, rol: u.rol, sid: familia });
    return { accessToken, refreshToken, usuario: this.publico(u) };
  }

  async refrescar(refreshToken: string | undefined, ctx: Contexto): Promise<Sesion> {
    if (!refreshToken) throw new NoAutenticadoError('Falta el refresh token');
    const hash = this.tokens.hash(refreshToken);
    const fila = await this.refresh.buscarPorHash(hash);
    if (!fila || fila.revocado_en) throw new NoAutenticadoError('Refresh inválido');
    if (fila.expira_en.getTime() < Date.now()) throw new NoAutenticadoError('Refresh expirado');

    const gano = await this.refresh.marcarUsado(fila.id);
    if (!gano) return this.manejarReutilizacion(hash, fila.familia_id, fila.usuario_id);

    const u = await this.usuarios.buscarPorId(fila.usuario_id);
    if (!u || !u.activo) {
      await this.revocarFamilia(fila.familia_id);
      throw new NoAutenticadoError('Usuario inactivo');
    }
    const nuevoRefresh = await this.crearRefresh(u.id, fila.familia_id, ctx);
    const accessToken = await this.tokens.firmarAccess({ sub: u.id, rol: u.rol, sid: fila.familia_id });
    return { accessToken, refreshToken: nuevoRefresh };
  }

  async logout(familiaId: string): Promise<void> {
    await this.revocarFamilia(familiaId);
  }

  async logoutAll(usuarioId: number): Promise<void> {
    const familias = await this.refresh.familiasActivasOrdenadas(usuarioId);
    await this.refresh.revocarPorUsuario(usuarioId);
    for (const f of familias) await this.cache.invalidar(f);
  }

  async obtener(usuarioId: number): Promise<UsuarioPublico | null> {
    const u = await this.usuarios.buscarPorId(usuarioId);
    return u && u.activo ? this.publico(u) : null;
  }

  /** ¿La familia de un access token sigue viva? Con caché de 30 s en Redis. */
  async familiaActiva(sid: string): Promise<boolean> {
    const cacheada = await this.cache.activa(sid);
    if (cacheada !== null) return cacheada;
    const activa = await this.refresh.familiaTieneActivo(sid);
    await this.cache.guardar(sid, activa);
    return activa;
  }

  private async manejarReutilizacion(hash: string, familiaId: string, usuarioId: number): Promise<never> {
    const actual = await this.refresh.buscarPorHash(hash);
    const usado = actual?.usado_en?.getTime() ?? 0;
    if (actual && !actual.revocado_en && Date.now() - usado <= GRACIA_MS) {
      throw new NoAutenticadoError('Refresh ya usado');
    }
    this.logger.warn({ familiaId, usuarioId }, 'auth.refresh_reutilizado');
    await this.revocarFamilia(familiaId);
    throw new NoAutenticadoError('Refresh reutilizado');
  }

  private async aplicarLimiteSesiones(usuarioId: number): Promise<void> {
    const familias = await this.refresh.familiasActivasOrdenadas(usuarioId);
    // Deja espacio para la familia nueva: revoca las más antiguas que sobren.
    const sobran = familias.length - (this.maxSesiones - 1);
    for (const fam of familias.slice(0, Math.max(0, sobran))) await this.revocarFamilia(fam);
  }

  private async crearRefresh(usuarioId: number, familiaId: string, ctx: Contexto): Promise<string> {
    const { token, hash } = this.tokens.generarRefresh();
    await this.refresh.crear({
      usuario_id: usuarioId,
      familia_id: familiaId,
      token_hash: hash,
      expira_en: new Date(Date.now() + this.refreshTtlMs),
      ip: ctx.ip,
      user_agent: ctx.userAgent,
    });
    return token;
  }

  private async revocarFamilia(familiaId: string): Promise<void> {
    await this.refresh.revocarFamilia(familiaId);
    await this.cache.invalidar(familiaId);
  }

  private publico(u: { id: number; usuario: string; rol: UsuarioPublico['rol'] }): UsuarioPublico {
    return { id: u.id, usuario: u.usuario, rol: u.rol };
  }
}
