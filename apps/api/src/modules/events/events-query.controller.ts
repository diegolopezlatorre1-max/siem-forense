import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type Evento,
  EventoSchema,
  type EventosQuery,
  EventosQuerySchema,
  paginado,
  type Paginado,
  type Severidad,
  type TipoEvento,
} from '@siem/shared';

import { Autenticado } from '../../common/auth/decoradores.js';
import { esquema } from '../../common/openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { EventoEntity } from './evento.entity.js';
import { EVENTOS_REPO, type EventosRepository } from './eventos.repository.js';

export const eventoADto = (e: EventoEntity): Evento => ({
  id: e.id,
  event_id: e.event_id,
  ts: e.ts.toISOString(),
  host: e.host,
  source: e.source,
  event_type: e.event_type as TipoEvento,
  usuario: e.usuario,
  src_ip: e.src_ip,
  severity: e.severity as Severidad,
  raw: e.raw,
  recibido_en: e.recibido_en.toISOString(),
  agente_id: e.agente_id,
});

@ApiTags('eventos')
@ApiBearerAuth()
@Controller('events')
export class EventsQueryController {
  constructor(@Inject(EVENTOS_REPO) private readonly eventos: EventosRepository) {}

  @Get()
  @Autenticado()
  @ApiQuery({ name: 'host', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'usuario', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'src_ip', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'event_type', required: false, schema: { type: 'string', enum: ['login_failed', 'login_success', 'user_created'] } })
  @ApiQuery({ name: 'desde', required: false, schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'hasta', required: false, schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'pagina', required: false, schema: { type: 'integer', minimum: 1, default: 1 } })
  @ApiQuery({ name: 'tamano', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } })
  @ApiResponse({ status: 200, schema: esquema(paginado(EventoSchema)) })
  async listar(@Query(new ZodValidationPipe(EventosQuerySchema)) q: EventosQuery): Promise<Paginado<Evento>> {
    const [filas, total] = await this.eventos.listar(
      { host: q.host, usuario: q.usuario, src_ip: q.src_ip, event_type: q.event_type, desde: q.desde, hasta: q.hasta },
      q.pagina,
      q.tamano,
    );
    return { items: filas.map(eventoADto), total, pagina: q.pagina, tamano: q.tamano };
  }
}
