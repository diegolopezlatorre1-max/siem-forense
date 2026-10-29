import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type Alerta,
  AlertaSchema,
  type AlertasQuery,
  AlertasQuerySchema,
  paginado,
  type Paginado,
  type Severidad,
} from '@siem/shared';

import { Autenticado } from '../../common/auth/decoradores.js';
import { esquema } from '../../common/openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { AlertaEntity } from './alerta.entity.js';
import { ALERTAS_REPO, type AlertasRepository } from './alertas.repository.js';

const aDto = (a: AlertaEntity): Alerta => ({
  ...a,
  severidad: a.severidad as Severidad,
  ts: a.ts.toISOString(),
  creada_en: a.creada_en.toISOString(),
});

@ApiTags('alertas')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(@Inject(ALERTAS_REPO) private readonly alertas: AlertasRepository) {}

  @Get()
  @Autenticado()
  @ApiQuery({ name: 'severidad', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } })
  @ApiQuery({ name: 'regla_id', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'pagina', required: false, schema: { type: 'integer', minimum: 1, default: 1 } })
  @ApiQuery({ name: 'tamano', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } })
  @ApiResponse({ status: 200, schema: esquema(paginado(AlertaSchema)) })
  async listar(@Query(new ZodValidationPipe(AlertasQuerySchema)) q: AlertasQuery): Promise<Paginado<Alerta>> {
    const [filas, total] = await this.alertas.listar({ severidad: q.severidad, regla_id: q.regla_id }, q.pagina, q.tamano);
    return { items: filas.map(aDto), total, pagina: q.pagina, tamano: q.tamano };
  }
}
