import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

import { ConfigService } from '../../config/config.service.js';

// Cliente ioredis compartido (caché de sesiones en S4, throttler en S20).
export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (c: ConfigService): Redis =>
        new Redis({ host: c.get('REDIS_HOST'), port: c.get('REDIS_PORT'), maxRetriesPerRequest: null }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
