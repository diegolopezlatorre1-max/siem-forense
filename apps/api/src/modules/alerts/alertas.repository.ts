import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, MoreThanOrEqual } from 'typeorm';

import type { AlertaNueva } from '../detection/engine.js';
import { AlertaEntity } from './alerta.entity.js';

export const ALERTAS_REPO = Symbol('ALERTAS_REPO');

export interface AlertasRepository {
  listar(pagina: number, tamano: number): Promise<[AlertaEntity[], number]>;
  existeDesde(reglaId: string, clave: string, desde: Date, em?: EntityManager): Promise<boolean>;
  /** Devuelve false si ya existía (constraint única regla_id + clave + ts). */
  insertar(alerta: AlertaNueva, em?: EntityManager): Promise<boolean>;
}

@Injectable()
export class TypeOrmAlertasRepository implements AlertasRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  listar(pagina: number, tamano: number): Promise<[AlertaEntity[], number]> {
    return this.ds.manager.findAndCount(AlertaEntity, {
      order: { ts: 'DESC', id: 'DESC' },
      skip: (pagina - 1) * tamano,
      take: tamano,
    });
  }

  existeDesde(reglaId: string, clave: string, desde: Date, em: EntityManager = this.ds.manager): Promise<boolean> {
    return em.exists(AlertaEntity, { where: { regla_id: reglaId, clave, ts: MoreThanOrEqual(desde) } });
  }

  async insertar(alerta: AlertaNueva, em: EntityManager = this.ds.manager): Promise<boolean> {
    const { raw } = await em.createQueryBuilder().insert().into(AlertaEntity).values(alerta).orIgnore().execute();
    // En PostgreSQL `raw` son las filas de RETURNING: vacío si ON CONFLICT DO NOTHING la descartó.
    return Array.isArray(raw) && raw.length > 0;
  }
}
