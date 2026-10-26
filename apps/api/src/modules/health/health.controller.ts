import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';

import { COLA_DETECCION } from '../detection/cola.js';

type Estado = 'ok' | 'error';

interface Salud {
  estado: Estado;
  db: Estado;
  redis: Estado;
}

const comprobar = (p: Promise<unknown>): Promise<Estado> =>
  p.then(
    () => 'ok',
    () => 'error',
  );

@ApiTags('salud')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectQueue(COLA_DETECCION) private readonly cola: Queue,
  ) {}

  @Get()
  async salud(@Res({ passthrough: true }) res: Response): Promise<Salud> {
    const [db, redis] = await Promise.all([
      comprobar(this.ds.query('SELECT 1')),
      comprobar(this.cola.getJobCounts('wait')),
    ]);
    const estado: Estado = db === 'ok' && redis === 'ok' ? 'ok' : 'error';
    if (estado === 'error') res.status(503);
    return { estado, db, redis };
  }
}
