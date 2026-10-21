import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Regla, TipoEvento } from '@siem/shared';
import type { DataSource } from 'typeorm';

import { ALERTAS_REPO, type AlertasRepository } from '../alerts/alertas.repository.js';
import { EVENTOS_REPO, type EventosRepository } from '../events/eventos.repository.js';
import { evaluar } from './engine.js';

export const REGLAS = Symbol('REGLAS');

// Puerto de app/detection/servicio.py: ahora lo ejecuta el worker, no la petición de ingesta.
@Injectable()
export class DeteccionService {
  private readonly logger = new Logger(DeteccionService.name);

  constructor(
    @Inject(REGLAS) private readonly reglas: readonly Regla[],
    @Inject(EVENTOS_REPO) private readonly eventos: EventosRepository,
    @Inject(ALERTAS_REPO) private readonly alertas: AlertasRepository,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  get tiposVigilados(): TipoEvento[] {
    return [...new Set(this.reglas.map((r) => r.event_type))];
  }

  /** Evalúa las reglas de un tipo de evento y devuelve cuántas alertas nuevas se crearon. */
  async evaluarTipo(eventType: TipoEvento, ahora = new Date()): Promise<number> {
    let nuevas = 0;
    await this.ds.transaction(async (em) => {
      for (const regla of this.reglas.filter((r) => r.event_type === eventType)) {
        const ventanaMs = regla.ventana_segundos * 1000;
        const recientes = await this.eventos.recientes(eventType, new Date(ahora.getTime() - ventanaMs * 10), em);
        for (const alerta of evaluar(regla, recientes)) {
          // Deduplicación: ya hay una alerta de la misma regla y clave dentro de la ventana.
          const desde = new Date(alerta.ts.getTime() - ventanaMs);
          if (await this.alertas.existeDesde(alerta.regla_id, alerta.clave, desde, em)) continue;
          if (await this.alertas.insertar(alerta, em)) {
            nuevas++;
            this.logger.log({ regla: alerta.regla_id, clave: alerta.clave, cantidad: alerta.cantidad }, 'alerta.creada');
          }
        }
      }
    });
    return nuevas;
  }
}
