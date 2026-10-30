import { Inject, Injectable } from '@nestjs/common';
import { LIMITE_LINEA_TIEMPO, type LineaTiempo, type LineaTiempoQuery } from '@siem/shared';

import { alertaADto } from '../alerts/alerts.controller.js';
import { ALERTAS_REPO, type AlertasRepository } from '../alerts/alertas.repository.js';
import { eventoADto } from '../events/events-query.controller.js';
import { EVENTOS_REPO, type EventosRepository } from '../events/eventos.repository.js';
import { mezclar } from './linea-tiempo.js';

@Injectable()
export class TimelineService {
  constructor(
    @Inject(EVENTOS_REPO) private readonly eventos: EventosRepository,
    @Inject(ALERTAS_REPO) private readonly alertas: AlertasRepository,
  ) {}

  /**
   * Eventos que cumplen todos los filtros dados y alertas cuya `clave` es alguno de ellos
   * (la clave es la IP, el usuario o el host según `agrupar_por` de la regla).
   * Si hay más de LIMITE_LINEA_TIEMPO de alguno, se devuelven los más recientes.
   */
  async consultar(q: LineaTiempoQuery): Promise<LineaTiempo> {
    const [eventos, totalEventos] = await this.eventos.listar(
      { host: q.host, usuario: q.usuario, src_ip: q.src_ip, desde: q.desde, hasta: q.hasta },
      1,
      LIMITE_LINEA_TIEMPO,
    );
    const claves = [q.host, q.usuario, q.src_ip].filter((c): c is string => c !== undefined);
    const [alertas, totalAlertas] = await this.alertas.porClaves(claves, q.desde, q.hasta, LIMITE_LINEA_TIEMPO);
    return {
      items: mezclar(eventos.map(eventoADto), alertas.map(alertaADto)),
      truncada: totalEventos > LIMITE_LINEA_TIEMPO || totalAlertas > LIMITE_LINEA_TIEMPO,
    };
  }
}
