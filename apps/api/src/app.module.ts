import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

import { AccesoGuard } from './common/guards/acceso.guard.js';
import { LoggerModule } from './common/logging/logger.module.js';
import { REDIS, RedisModule } from './common/redis/redis.module.js';
import { AppThrottlerGuard } from './common/throttler/app-throttler.guard.js';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage.js';
import { ConfigModule } from './config/config.module.js';
import { ConfigService } from './config/config.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { ForensicsModule } from './modules/forensics/forensics.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';

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
    ThrottlerModule.forRootAsync({
      inject: [REDIS],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: 60_000, limit: 120 }], // por defecto: 120/min
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    HealthModule,
    AuthModule,
    AgentsModule,
    UsersModule,
    EventsModule,
    AlertsModule,
    ForensicsModule,
  ],
  providers: [
    // Orden importante: primero autentica y autoriza (RBAC), luego limita.
    { provide: APP_GUARD, useClass: AccesoGuard },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
