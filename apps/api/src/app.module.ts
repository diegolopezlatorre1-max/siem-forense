import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { LoggerModule } from './common/logging/logger.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { ConfigModule } from './config/config.module.js';
import { ConfigService } from './config/config.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    RedisModule,
    DatabaseModule,
    // Productor: sin cola offline, para que /ingest no espere si Redis está caído.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        connection: { host: c.get('REDIS_HOST'), port: c.get('REDIS_PORT'), enableOfflineQueue: false },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { age: 3600 },
          removeOnFail: false,
        },
      }),
    }),
    HealthModule,
    AuthModule,
    EventsModule,
    AlertsModule,
  ],
})
export class AppModule {}
