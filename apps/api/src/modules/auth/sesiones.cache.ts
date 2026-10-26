import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS } from '../../common/redis/redis.module.js';

export const CACHE_SESIONES = Symbol('CACHE_SESIONES');

// Evita consultar la base en cada request para saber si una familia sigue viva.
export interface CacheSesiones {
  activa(sid: string): Promise<boolean | null>; // null = no está en caché
  guardar(sid: string, activa: boolean): Promise<void>;
  invalidar(sid: string): Promise<void>;
}

const TTL_SEG = 30;
const clave = (sid: string): string => `sesion:activa:${sid}`;

@Injectable()
export class RedisCacheSesiones implements CacheSesiones {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async activa(sid: string): Promise<boolean | null> {
    const v = await this.redis.get(clave(sid));
    return v === null ? null : v === '1';
  }

  async guardar(sid: string, activa: boolean): Promise<void> {
    await this.redis.set(clave(sid), activa ? '1' : '0', 'EX', TTL_SEG);
  }

  async invalidar(sid: string): Promise<void> {
    await this.redis.del(clave(sid));
  }
}
