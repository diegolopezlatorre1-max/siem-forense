import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Rol } from '@siem/shared';
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
const CLAVE = 'Clave-rbac-123';
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function crearUsuario(usuario: string, rol: Rol): Promise<void> {
  await app
    .get(DataSource)
    .getRepository(UsuarioEntity)
    .save({ usuario, clave_hash: await hash(CLAVE), rol, activo: true });
}

async function token(usuario: string): Promise<string> {
  const r = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ usuario, clave: CLAVE }).expect(200);
  return r.body.accessToken as string;
}

beforeAll(async () => {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const nest = modulo.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configurarApp(nest);
  await nest.init();
  await nest.listen(0); // escucha en un puerto real para evitar la carrera del servidor efímero de supertest
  app = nest as unknown as INestApplication<App>;
});

afterAll(async () => {
  await app?.close();
});

describe('RBAC', () => {
  it('el auditor recibe 403 en una ruta de admin', async () => {
    const auditor = `e2e-auditor-${randomUUID().slice(0, 8)}`;
    await crearUsuario(auditor, 'auditor');
    const r = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(await token(auditor))).expect(403);
    expect(r.body.type).toContain('acceso-denegado');
  });

  it('el admin sí puede listar y crear usuarios', async () => {
    const admin = `e2e-admin-${randomUUID().slice(0, 8)}`;
    await crearUsuario(admin, 'admin');
    const t = await token(admin);

    const lista = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(t)).expect(200);
    expect(Array.isArray(lista.body)).toBe(true);

    const nuevo = `e2e-creado-${randomUUID().slice(0, 8)}`;
    const creado = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(t))
      .send({ usuario: nuevo, clave: 'Clave-nueva-123', rol: 'analista' })
      .expect(201);
    expect(creado.body).toMatchObject({ usuario: nuevo, rol: 'analista' });
  });

  it('sin token, /users responde 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });
});

describe('Rate limiting', () => {
  it('una ráfaga de logins recibe 429', async () => {
    const usuario = `e2e-rafaga-${randomUUID().slice(0, 8)}`; // no existe: todos fallan
    const codigos: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ usuario, clave: 'x' });
      codigos.push(r.status);
    }
    expect(codigos).toContain(429); // el límite es 5/min por IP+usuario
    expect(codigos.filter((c) => c === 401).length).toBeLessThanOrEqual(5);
  });
});
