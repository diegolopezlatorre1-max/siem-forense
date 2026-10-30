import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, type EntityManager, type FindOptionsWhere, In, MoreThanOrEqual } from 'typeorm';

import type { AlertaNueva } from '../detection/engine.js';
import { AlertaEntity } from './alerta.entity.js';

export const ALERTAS_REPO = Symbol('ALERTAS_REPO');

export interface FiltrosAlertas {
  estado?: string;
  severidad?: string;
  regla_id?: string;
}

// Cambios permitidos por la actualización condicional (asignación y estado).
export type CambiosAlerta = Partial<Pick<AlertaEntity, 'estado' | 'asignada_a'>>;

export interface AlertasRepository {
  listar(filtros: FiltrosAlertas, pagina: number, tamano: number): Promise<[AlertaEntity[], number]>;
  buscarPorId(id: number): Promise<AlertaEntity | null>;
  /**
   * Actualiza solo si la `version` coincide (bloqueo optimista) e incrementa la versión.
   * Devuelve la fila ya actualizada, o null si otra escritura cambió la versión antes.
   */
  actualizarConVersion(id: number, version: number, cambios: CambiosAlerta): Promise<AlertaEntity | null>;
  existeDesde(reglaId: string, clave: string, desde: Date, em?: EntityManager): Promise<boolean>;
  /** Devuelve false si ya existía (constraint única regla_id + clave + ts). */
  insertar(alerta: AlertaNueva, em?: EntityManager): Promise<boolean>;
  /** Línea de tiempo: alertas cuya clave es alguno de los valores, en el rango; las más recientes primero. */
  porClaves(claves: readonly string[], desde: Date, hasta: Date, limite: number): Promise<[AlertaEntity[], number]>;
}

@Injectable()
export class TypeOrmAlertasRepository implements AlertasRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  listar(filtros: FiltrosAlertas, pagina: number, tamano: number): Promise<[AlertaEntity[], number]> {
    const where: FindOptionsWhere<AlertaEntity> = {};
    if (filtros.estado !== undefined) where.estado = filtros.estado;
    if (filtros.severidad !== undefined) where.severidad = filtros.severidad;
    if (filtros.regla_id !== undefined) where.regla_id = filtros.regla_id;

    return this.ds.manager.findAndCount(AlertaEntity, {
      where,
      order: { ts: 'DESC', id: 'DESC' },
      skip: (pagina - 1) * tamano,
      take: tamano,
    });
  }

  buscarPorId(id: number): Promise<AlertaEntity | null> {
    return this.ds.manager.findOneBy(AlertaEntity, { id });
  }

  async actualizarConVersion(id: number, version: number, cambios: CambiosAlerta): Promise<AlertaEntity | null> {
    const { affected } = await this.ds
      .createQueryBuilder()
      .update(AlertaEntity)
      .set({ ...cambios, version: () => 'version + 1' })
      .where('id = :id AND version = :version', { id, version })
      .execute();
    if (!affected) return null;
    return this.buscarPorId(id);
  }

  existeDesde(reglaId: string, clave: string, desde: Date, em: EntityManager = this.ds.manager): Promise<boolean> {
    return em.exists(AlertaEntity, { where: { regla_id: reglaId, clave, ts: MoreThanOrEqual(desde) } });
  }

  async insertar(alerta: AlertaNueva, em: EntityManager = this.ds.manager): Promise<boolean> {
    const { raw } = await em.createQueryBuilder().insert().into(AlertaEntity).values(alerta).orIgnore().execute();
    // En PostgreSQL `raw` son las filas de RETURNING: vacío si ON CONFLICT DO NOTHING la descartó.
    return Array.isArray(raw) && raw.length > 0;
  }

  porClaves(claves: readonly string[], desde: Date, hasta: Date, limite: number): Promise<[AlertaEntity[], number]> {
    return this.ds.manager.findAndCount(AlertaEntity, {
      where: { clave: In([...claves]), ts: Between(desde, hasta) },
      order: { ts: 'DESC', id: 'DESC' },
      take: limite,
    });
  }
}
