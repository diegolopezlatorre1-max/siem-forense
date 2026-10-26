import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { COLA_DETECCION } from '../detection/cola.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [BullModule.registerQueue({ name: COLA_DETECCION })],
  controllers: [HealthController],
})
export class HealthModule {}
