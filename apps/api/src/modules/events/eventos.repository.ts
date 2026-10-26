import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, MoreThanOrEqual } from 'typeorm';

import type { EventoEvaluable } from '../detection/engine.js';
import { EventoEntity } from './evento.entity.js';

export const EVENTOS_REPO = Symbol('EVENTOS_REPO');

export type NuevoEvento = Omit<EventoEntity, 'id' | 'recibido_en'>;

export interface EventosRepository {
  insertar(evento: NuevoEvento, em?: EntityManager): Promise<number>;
  recientes(eventType: string, desde: Date, em?: EntityManager): Promise<EventoEvaluable[]>;
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
}
