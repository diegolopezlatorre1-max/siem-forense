import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, type EntityManager, type FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

import type { EventoEvaluable } from '../detection/engine.js';
import { EventoEntity } from './evento.entity.js';

export const EVENTOS_REPO = Symbol('EVENTOS_REPO');

export type NuevoEvento = Omit<EventoEntity, 'id' | 'recibido_en'>;

export interface FiltrosEventos {
  host?: string;
  usuario?: string;
  src_ip?: string;
  event_type?: string;
  desde?: Date;
  hasta?: Date;
}

export interface EventosRepository {
  insertar(evento: NuevoEvento, em?: EntityManager): Promise<number>;
  recientes(eventType: string, desde: Date, em?: EntityManager): Promise<EventoEvaluable[]>;
  listar(filtros: FiltrosEventos, pagina: number, tamano: number): Promise<[EventoEntity[], number]>;
}

@Injectable()
export class TypeOrmEventosRepository implements EventosRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async insertar(evento: NuevoEvento, em: EntityManager = this.ds.manager): Promise<number> {
    const { identifiers } = await em.insert(EventoEntity, evento);
    return Number(identifiers[0]?.['id']);
  }

  recientes(eventType: string, desde: Date, em: EntityManager = this.ds.manager): Promise<EventoEvaluable[]> {
    return em.find(EventoEntity, {
      select: { event_type: true, ts: true, src_ip: true, usuario: true, host: true },
      where: { event_type: eventType, ts: MoreThanOrEqual(desde) },
    });
  }

  listar(filtros: FiltrosEventos, pagina: number, tamano: number): Promise<[EventoEntity[], number]> {
    const where: FindOptionsWhere<EventoEntity> = {};
    if (filtros.host !== undefined) where.host = filtros.host;
    if (filtros.usuario !== undefined) where.usuario = filtros.usuario;
    if (filtros.src_ip !== undefined) where.src_ip = filtros.src_ip;
    if (filtros.event_type !== undefined) where.event_type = filtros.event_type;
    if (filtros.desde !== undefined && filtros.hasta !== undefined) where.ts = Between(filtros.desde, filtros.hasta);
    else if (filtros.desde !== undefined) where.ts = MoreThanOrEqual(filtros.desde);
    else if (filtros.hasta !== undefined) where.ts = LessThanOrEqual(filtros.hasta);

    return this.ds.manager.findAndCount(EventoEntity, {
      where,
      order: { ts: 'DESC', id: 'DESC' },
      skip: (pagina - 1) * tamano,
      take: tamano,
    });
  }
}
