import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type LineaTiempo, type LineaTiempoQuery, LineaTiempoQuerySchema, LineaTiempoSchema } from '@siem/shared';

import { Autenticado } from '../../common/auth/decoradores.js';
import { esquema } from '../../common/openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { TimelineService } from './timeline.service.js';

@ApiTags('linea-tiempo')
@ApiBearerAuth()
@Controller('timeline')
export class TimelineController {
  constructor(private readonly servicio: TimelineService) {}

  @Get()
  @Autenticado()
  @ApiQuery({ name: 'host', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'usuario', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'src_ip', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'desde', required: true, schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'hasta', required: true, schema: { type: 'string', format: 'date-time' } })
  @ApiResponse({ status: 200, schema: esquema(LineaTiempoSchema) })
  consultar(@Query(new ZodValidationPipe(LineaTiempoQuerySchema)) q: LineaTiempoQuery): Promise<LineaTiempo> {
    return this.servicio.consultar(q);
  }
}
