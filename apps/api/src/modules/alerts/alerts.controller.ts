import { Controller, Get, Inject, Query } from '@nestjs/common';
import { type Alerta, type AlertasQuery, AlertasQuerySchema, type Paginado, type Severidad } from '@siem/shared';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { AlertaEntity } from './alerta.entity.js';
import { ALERTAS_REPO, type AlertasRepository } from './alertas.repository.js';

const aDto = (a: AlertaEntity): Alerta => ({
  ...a,
  severidad: a.severidad as Severidad,
  ts: a.ts.toISOString(),
  creada_en: a.creada_en.toISOString(),
});

// TODO(S4): exigir Bearer (JwtAuthGuard global). Hasta entonces es de solo lectura y abierto, como en el backend Python.
@Controller('alerts')
export class AlertsController {
  constructor(@Inject(ALERTAS_REPO) private readonly alertas: AlertasRepository) {}

  @Get()
  async listar(@Query(new ZodValidationPipe(AlertasQuerySchema)) q: AlertasQuery): Promise<Paginado<Alerta>> {
    const [filas, total] = await this.alertas.listar(q.pagina, q.tamano);
    return { items: filas.map(aDto), total, pagina: q.pagina, tamano: q.tamano };
  }
}
