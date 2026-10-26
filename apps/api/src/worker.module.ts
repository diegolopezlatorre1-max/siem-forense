import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { LoggerModule } from './common/logging/logger.module.js';
import { ConfigModule } from './config/config.module.js';
import { ConfigService } from './config/config.service.js';
import { DatabaseModule } from './database/database.module.js';
import { COLA_DETECCION } from './modules/detection/cola.js';
import { DeteccionProcessor } from './modules/detection/deteccion.processor.js';
import { DetectionModule } from './modules/detection/detection.module.js';

// Proceso aparte (main.worker.ts): consume la cola de detección, sin HTTP.
@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        connection: { host: c.get('REDIS_HOST'), port: c.get('REDIS_PORT'), maxRetriesPerRequest: null },
      }),
    }),
    BullModule.registerQueue({ name: COLA_DETECCION }),
    DetectionModule,
  ],
  providers: [DeteccionProcessor],
})
export class WorkerModule {}
