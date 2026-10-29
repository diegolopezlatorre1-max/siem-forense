import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module.js';
import { COLA_DETECCION } from '../detection/cola.js';
import { ForensicsModule } from '../forensics/forensics.module.js';
import { EventsController } from './events.controller.js';
import { EventsQueryController } from './events-query.controller.js';
import { EVENTOS_REPO, TypeOrmEventosRepository } from './eventos.repository.js';
import { IngestaService } from './ingesta.service.js';

export const eventosRepoProvider = { provide: EVENTOS_REPO, useClass: TypeOrmEventosRepository };

@Module({
  imports: [AgentsModule, ForensicsModule, BullModule.registerQueue({ name: COLA_DETECCION })],
  controllers: [EventsController, EventsQueryController],
  providers: [IngestaService, eventosRepoProvider],
})
export class EventsModule {}
