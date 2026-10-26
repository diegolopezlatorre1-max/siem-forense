import { Module } from '@nestjs/common';

import { ConfigService } from '../../config/config.service.js';
import { alertasRepoProvider } from '../alerts/alerts.module.js';
import { eventosRepoProvider } from '../events/events.module.js';
import { DeteccionService, REGLAS } from './deteccion.service.js';
import { cargarReglas } from './rules.loader.js';

// Una regla inválida detiene el arranque con el archivo y el campo (docs/09).
@Module({
  providers: [
    { provide: REGLAS, inject: [ConfigService], useFactory: (c: ConfigService) => cargarReglas(c.reglasDir) },
    DeteccionService,
    eventosRepoProvider,
    alertasRepoProvider,
  ],
  exports: [DeteccionService],
})
export class DetectionModule {}
