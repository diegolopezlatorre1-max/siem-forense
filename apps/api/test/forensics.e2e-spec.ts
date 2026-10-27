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
import { AgenteEntity } from '../src/modules/agents/agente.entity.js';
import { generarLlave } from '../src/modules/agents/llave.js';
import { UsuarioEntity } from '../src/modules/auth/usuario.entity.js';

// Requiere PostgreSQL y Redis del docker compose con las migraciones aplicadas.
let app: INestApplication<App>;
let llave: string;
const CLAVE = 'Clave-forense-123';
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

const evento = (raw = 'Failed password for invalid user intruso (forense)') => ({
  event_id: randomUUID().replaceAll('-', ''),
  ts: new Date().toISOString(),
  host: 'forense',
  source: 'auth.log',
  event_type: 'login_failed',
  usuario: 'intruso',
  src_ip: '10.0.0.9',
  raw,
});

const ingestar = (e: ReturnType<typeof evento>) =>
  request(app.getHttpServer()).post('/api/v1/ingest').set('x-agent-key', llave).send(e);

async function usuarioToken(rol: Rol): Promise<string> {
  const usuario = `e2e-for-${rol}-${randomUUID().slice(0, 8)}`;
  await app
    .get(DataSource)
    .getRepository(UsuarioEntity)
    .save({ usuario, clave_hash: await hash(CLAVE), rol, activo: true });
  const r = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ usuario, clave: CLAVE }).expect(200);
  return r.body.accessToken as string;
}

beforeAll(async () => {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const nest = modulo.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configurarApp(nest);
  await nest.init();
  await nest.listen(0);
  app = nest as unknown as INestApplication<App>;

  const g = generarLlave();
  llave = g.llave;
  await app
    .get(DataSource)
    .getRepository(AgenteEntity)
    .save({ nombre: `e2e-for-${g.prefijo}`, prefijo_llave: g.prefijo, llave_hash: await hash(llave) });
});

afterAll(async () => {
  await app?.close();
});

describe('cadena forense', () => {
  it('sella el evento al ingerirlo (devuelve secuencia)', async () => {
    const r = await ingestar(evento()).expect(202);
    expect(typeof r.body.id).toBe('number');
    expect(typeof r.body.secuencia).toBe('number');
    expect(r.body.secuencia).toBeGreaterThan(0);
  });

  it('el admin verifica y la cadena está íntegra', async () => {
    const admin = await usuarioToken('admin');
    const r = await request(app.getHttpServer()).get('/api/v1/forensics/verify').set(bearer(admin)).expect(200);
    expect(r.body.integra).toBe(true);
    expect(r.body.eslabones).toBeGreaterThan(0);
  });

  it('el analista no puede verificar (403)', async () => {
    const analista = await usuarioToken('analista');
    await request(app.getHttpServer()).get('/api/v1/forensics/verify').set(bearer(analista)).expect(403);
  });

  it('alterar un evento marca evento_alterado en el eslabón exacto, y se restaura', async () => {
    const auditor = await usuarioToken('auditor');
    const original = 'Failed password for invalid user victima (forense-alter)';
    const ing = await ingestar(evento(original)).expect(202);
    const id = ing.body.id as number;

    const ds = app.get(DataSource);
    await ds.query('UPDATE eventos SET raw = $1 WHERE id = $2', ['ALTERADO POR UN ATAQUE', id]);

    const roto = await request(app.getHttpServer()).get('/api/v1/forensics/verify').set(bearer(auditor)).expect(200);
    expect(roto.body.integra).toBe(false);
    expect(roto.body.primerFallo).toMatchObject({ motivo: 'evento_alterado', eventoId: id });

    // Restaurar la evidencia deja la cadena válida de nuevo (append-only en producción).
    await ds.query('UPDATE eventos SET raw = $1 WHERE id = $2', [original, id]);
    const ok = await request(app.getHttpServer()).get('/api/v1/forensics/verify').set(bearer(auditor)).expect(200);
    expect(ok.body.integra).toBe(true);
  });

  it('20 ingestas concurrentes dejan una cadena válida', async () => {
    const admin = await usuarioToken('admin');
    const respuestas = await Promise.all(Array.from({ length: 20 }, () => ingestar(evento())));
    expect(respuestas.every((r) => r.status === 202)).toBe(true);
    const secuencias = respuestas.map((r) => r.body.secuencia as number);
    expect(new Set(secuencias).size).toBe(20); // sin duplicados

    const r = await request(app.getHttpServer()).get('/api/v1/forensics/verify').set(bearer(admin)).expect(200);
    expect(r.body.integra).toBe(true);
  });
});
