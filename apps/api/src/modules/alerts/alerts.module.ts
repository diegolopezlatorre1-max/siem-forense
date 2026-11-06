import { Module } from '@nestjs/common';

import { AlertsController } from './alerts.controller.js';
import { ALERTAS_REPO, TypeOrmAlertasRepository } from './alertas.repository.js';
import { AlertasService } from './alertas.service.js';

export const alertasRepoProvider = { provide: ALERTAS_REPO, useClass: TypeOrmAlertasRepository };

@Module({
  controllers: [AlertsController],
  providers: [alertasRepoProvider, AlertasService],
})
export class AlertsModule {}
