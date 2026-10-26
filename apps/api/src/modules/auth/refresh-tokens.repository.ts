import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { RefreshTokenEntity } from './refresh-token.entity.js';

export const REFRESH_REPO = Symbol('REFRESH_REPO');

export interface NuevoRefresh {
  usuario_id: number;
  familia_id: string;
  token_hash: string;
  expira_en: Date;
  ip: string | null;
  user_agent: string | null;
}

export interface RefreshTokensRepository {
  crear(datos: NuevoRefresh): Promise<void>;
  buscarPorHash(hash: string): Promise<RefreshTokenEntity | null>;
  /** Marca el token como usado solo si aún no lo estaba. true = esta llamada ganó la carrera. */
  marcarUsado(id: string): Promise<boolean>;
  revocarFamilia(familiaId: string): Promise<void>;
  revocarPorUsuario(usuarioId: number): Promise<void>;
  /** familia_id de las sesiones activas del usuario, de la más antigua a la más reciente. */
  familiasActivasOrdenadas(usuarioId: number): Promise<string[]>;
  familiaTieneActivo(familiaId: string): Promise<boolean>;
}

@Injectable()
export class TypeOrmRefreshTokensRepository implements RefreshTokensRepository {
  constructor(@InjectRepository(RefreshTokenEntity) private readonly repo: Repository<RefreshTokenEntity>) {}

  async crear(datos: NuevoRefresh): Promise<void> {
    await this.repo.insert({ ...datos, usado_en: null, revocado_en: null });
  }

  buscarPorHash(hash: string): Promise<RefreshTokenEntity | null> {
    return this.repo.findOneBy({ token_hash: hash });
  }

  async marcarUsado(id: string): Promise<boolean> {
    const r = await this.repo
      .createQueryBuilder()
      .update()
      .set({ usado_en: () => 'now()' })
      .where('id = :id AND usado_en IS NULL', { id })
      .execute();
    return r.affected === 1;
  }

  async revocarFamilia(familiaId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ revocado_en: () => 'now()' })
      .where('familia_id = :f AND revocado_en IS NULL', { f: familiaId })
      .execute();
  }

  async revocarPorUsuario(usuarioId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ revocado_en: () => 'now()' })
      .where('usuario_id = :u AND revocado_en IS NULL', { u: usuarioId })
      .execute();
  }

  async familiasActivasOrdenadas(usuarioId: number): Promise<string[]> {
    const filas = await this.repo
      .createQueryBuilder('t')
      .select('t.familia_id', 'familia')
      .where('t.usuario_id = :u AND t.revocado_en IS NULL', { u: usuarioId })
      .groupBy('t.familia_id')
      // expira_en = creación + TTL fijo, así que ordena por antigüedad de la familia.
      .orderBy('MIN(t.expira_en)', 'ASC')
      .getRawMany<{ familia: string }>();
    return filas.map((f) => f.familia);
  }

  async familiaTieneActivo(familiaId: string): Promise<boolean> {
    const n = await this.repo
      .createQueryBuilder('t')
      .where('t.familia_id = :f AND t.revocado_en IS NULL', { f: familiaId })
      .getCount();
    return n > 0;
  }
}
