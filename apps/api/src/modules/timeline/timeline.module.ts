import { Module } from '@nestjs/common';

import { alertasRepoProvider } from '../alerts/alerts.module.js';
import { eventosRepoProvider } from '../events/events.module.js';
import { TimelineController } from './timeline.controller.js';
import { TimelineService } from './timeline.service.js';

// Solo lectura: reutiliza los repositorios de eventos y alertas.
@Module({
  controllers: [TimelineController],
  providers: [eventosRepoProvider, alertasRepoProvider, TimelineService],
})
export class TimelineModule {}
