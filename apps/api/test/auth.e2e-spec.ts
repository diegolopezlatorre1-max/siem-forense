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
import { UsuarioEntity } from '../src/modules/auth/usuario.entity.js';

// Requiere PostgreSQL y Redis del docker compose con las migraciones aplicadas.
let app: INestApplication<App>;
const USUARIO = `e2e-${randomUUID().slice(0, 8)}`;
const CLAVE = 'Clave-e2e-larga-123';
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const nest = modulo.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configurarApp(nest);
  await nest.init();
  app = nest as unknown as INestApplication<App>;

  await app
    .get(DataSource)
    .getRepository(UsuarioEntity)
    .save({ usuario: USUARIO, clave_hash: await hash(CLAVE), rol: 'admin', activo: true });
});

afterAll(async () => {
  await app?.close();
});

describe('auth', () => {
  it('rechaza credenciales inválidas con 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ usuario: USUARIO, clave: 'mala' })
      .expect(401);
  });

  it('login, me, refresh, logout y revocación de la familia', async () => {
    const agente = request.agent(app.getHttpServer());

    const login = await agente.post('/api/v1/auth/login').send({ usuario: USUARIO, clave: CLAVE }).expect(200);
    expect(login.body.usuario).toMatchObject({ usuario: USUARIO, rol: 'admin' });
    expect(typeof login.body.accessToken).toBe('string');
    const cookie = String(login.headers['set-cookie']);
    expect(cookie).toContain('refresh_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');

    await agente.get('/api/v1/auth/me').set(bearer(login.body.accessToken)).expect(200);

    const refresh = await agente.post('/api/v1/auth/refresh').expect(200);
    const access2 = refresh.body.accessToken as string;
    expect(access2).not.toBe(login.body.accessToken);
    await agente.get('/api/v1/auth/me').set(bearer(access2)).expect(200);

    await agente.post('/api/v1/auth/logout').set(bearer(access2)).expect(204);

    // Tras el logout la familia queda revocada: refresh y el access ya no sirven.
    await agente.post('/api/v1/auth/refresh').expect(401);
    await agente.get('/api/v1/auth/me').set(bearer(access2)).expect(401);
  });

  it('logout-all invalida todas las sesiones del usuario', async () => {
    const agente = request.agent(app.getHttpServer());
    const login = await agente.post('/api/v1/auth/login').send({ usuario: USUARIO, clave: CLAVE }).expect(200);
    await agente.post('/api/v1/auth/logout-all').set(bearer(login.body.accessToken)).expect(204);
    await agente.post('/api/v1/auth/refresh').expect(401);
  });
});
