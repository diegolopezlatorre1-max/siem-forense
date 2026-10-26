import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { hash } from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';
import { AgenteEntity } from '../src/modules/agents/agente.entity.js';
import { generarLlave } from '../src/modules/agents/llave.js';

// Requiere PostgreSQL y Redis del docker compose con las migraciones aplicadas.
let app: INestApplication<App>;
let llave: string;

const evento = () => ({
  event_id: randomUUID().replaceAll('-', ''),
  ts: new Date().toISOString(),
  host: 'e2e',
  source: 'auth.log',
  event_type: 'login_failed',
  usuario: 'intruso',
  src_ip: '10.255.0.1',
  raw: 'Failed password for invalid user intruso (e2e)',
});

beforeAll(async () => {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const nest = modulo.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configurarApp(nest);
  await nest.init();
  app = nest as unknown as INestApplication<App>;

  const generada = generarLlave();
  llave = generada.llave;
  await app.get(DataSource).getRepository(AgenteEntity).save({
    nombre: `e2e-${generada.prefijo}`,
    prefijo_llave: generada.prefijo,
    llave_hash: await hash(llave),
  });
});

afterAll(async () => {
  await app?.close();
});

describe('base de la API', () => {
  it('GET /health responde ok con db y redis', async () => {
    const r = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(r.body).toEqual({ estado: 'ok', db: 'ok', redis: 'ok' });
  });

  it('devuelve el x-correlation-id recibido', async () => {
    const id = randomUUID();
    const r = await request(app.getHttpServer()).get('/api/v1/health').set('x-correlation-id', id);
    expect(r.headers['x-correlation-id']).toBe(id);
  });

  it('una ruta inexistente responde problem+json con correlationId', async () => {
    const r = await request(app.getHttpServer()).get('/api/v1/no-existe').expect(404);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.body.correlationId).toBe(r.headers['x-correlation-id']);
  });
});

describe('POST /ingest', () => {
  it('sin llave responde 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/ingest').send(evento()).expect(401);
  });

  it('con una llave inventada responde 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/ingest')
      .set('x-agent-key', generarLlave().llave)
      .send(evento())
      .expect(401);
  });

  it('un evento inválido responde 400 con errors[]', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/ingest')
      .set('x-agent-key', llave)
      .send({ ...evento(), src_ip: 'no-es-ip' })
      .expect(400);
    expect(r.body.errors[0].ruta).toBe('src_ip');
  });

  it('acepta el evento (202) y rechaza el duplicado (409)', async () => {
    const e = evento();
    const ok = await request(app.getHttpServer()).post('/api/v1/ingest').set('x-agent-key', llave).send(e).expect(202);
    expect(typeof ok.body.id).toBe('number');
    await request(app.getHttpServer()).post('/api/v1/ingest').set('x-agent-key', llave).send(e).expect(409);
  });
});

describe('GET /alerts', () => {
  it('devuelve una página', async () => {
    const r = await request(app.getHttpServer()).get('/api/v1/alerts?tamano=5').expect(200);
    expect(r.body).toMatchObject({ pagina: 1, tamano: 5 });
    expect(Array.isArray(r.body.items)).toBe(true);
  });

  it('valida la query', async () => {
    await request(app.getHttpServer()).get('/api/v1/alerts?tamano=1000').expect(400);
  });
});
