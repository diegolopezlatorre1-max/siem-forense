import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

// La forma del registro que espera @nestjs/throttler (no exporta el tipo por nombre).
interface Registro {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

// Almacén del rate limiting en Redis, para que los límites valgan en todas las instancias.
// ttl y blockDuration llegan en milisegundos; timeToExpire/timeToBlockExpire salen en segundos.
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<Registro> {
    const k = `thr:${throttlerName}:${key}`;
    const bk = `thr:bloqueo:${throttlerName}:${key}`;

    const bloqueo = await this.redis.pttl(bk);
    if (bloqueo > 0) {
      return { totalHits: limit + 1, timeToExpire: 0, isBlocked: true, timeToBlockExpire: Math.ceil(bloqueo / 1000) };
    }

    const totalHits = await this.redis.incr(k);
    if (totalHits === 1) await this.redis.pexpire(k, ttl);
    let pttl = await this.redis.pttl(k);
    if (pttl < 0) {
      pttl = ttl;
      await this.redis.pexpire(k, ttl);
    }

    if (totalHits > limit) {
      const dur = blockDuration > 0 ? blockDuration : ttl;
      await this.redis.set(bk, '1', 'PX', dur);
      return { totalHits, timeToExpire: Math.ceil(pttl / 1000), isBlocked: true, timeToBlockExpire: Math.ceil(dur / 1000) };
    }
    return { totalHits, timeToExpire: Math.ceil(pttl / 1000), isBlocked: false, timeToBlockExpire: 0 };
  }
}
