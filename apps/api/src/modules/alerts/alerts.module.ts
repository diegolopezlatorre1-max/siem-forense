import { Module } from '@nestjs/common';

import { AlertsController } from './alerts.controller.js';
import { ALERTAS_REPO, TypeOrmAlertasRepository } from './alertas.repository.js';

export const alertasRepoProvider = { provide: ALERTAS_REPO, useClass: TypeOrmAlertasRepository };

@Module({
  controllers: [AlertsController],
  providers: [alertasRepoProvider],
})
export class AlertsModule {}
