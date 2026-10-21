import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { type EventoIngesta, EventoIngestaSchema, type IngestaRespuesta } from '@siem/shared';

import { AgenteActual } from '../../common/decorators/agente-actual.decorator.js';
import { AgentKeyGuard } from '../../common/guards/agent-key.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { IngestaService } from './ingesta.service.js';

@Controller()
export class EventsController {
  constructor(private readonly ingesta: IngestaService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AgentKeyGuard)
  ingest(
    @Body(new ZodValidationPipe(EventoIngestaSchema)) evento: EventoIngesta,
    @AgenteActual() agenteId: number | undefined,
  ): Promise<IngestaRespuesta> {
    return this.ingesta.ingestar(evento, agenteId);
  }
}
