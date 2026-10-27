import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type EventoIngesta, EventoIngestaSchema, type IngestaRespuesta, IngestaRespuestaSchema, ProblemSchema } from '@siem/shared';

import { AgenteKey } from '../../common/auth/decoradores.js';
import { AgenteActual } from '../../common/decorators/agente-actual.decorator.js';
import { esquema } from '../../common/openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { IngestaService } from './ingesta.service.js';

@ApiTags('ingesta')
@Controller()
export class EventsController {
  constructor(private readonly ingesta: IngestaService) {}

  @Post('ingest')
  @AgenteKey()
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSecurity('agente')
  @ApiBody({ schema: esquema(EventoIngestaSchema, 'input') })
  @ApiResponse({ status: 202, schema: esquema(IngestaRespuestaSchema) })
  @ApiResponse({ status: 400, description: 'Evento inválido', schema: esquema(ProblemSchema) })
  @ApiResponse({ status: 401, description: 'Llave de agente inválida', schema: esquema(ProblemSchema) })
  @ApiResponse({ status: 409, description: 'event_id repetido', schema: esquema(ProblemSchema) })
  ingest(
    @Body(new ZodValidationPipe(EventoIngestaSchema)) evento: EventoIngesta,
    @AgenteActual() agenteId: number | undefined,
  ): Promise<IngestaRespuesta> {
    return this.ingesta.ingestar(evento, agenteId);
  }
}
