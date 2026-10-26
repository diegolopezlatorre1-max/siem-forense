import { NotFoundException } from '@nestjs/common';
import { EventoIngestaSchema } from '@siem/shared';
import { OptimisticLockVersionMismatchError, QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { ConflictoError } from '../errors/dominio.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

const filtro = new AllExceptionsFilter();

describe('AllExceptionsFilter', () => {
  it('un ZodError da 400 con la ruta de cada campo', () => {
    const { error } = EventoIngestaSchema.safeParse({ event_id: '' });
    const p = filtro.traducir(error);
    expect(p.status).toBe(400);
    expect(p.errors?.map((e) => e.ruta)).toContain('event_id');
  });

  it('los errores de dominio conservan su status y título', () => {
    const p = filtro.traducir(new ConflictoError('Evento ya recibido', 'event_id repetido'));
    expect(p).toMatchObject({ status: 409, title: 'Evento ya recibido', detail: 'event_id repetido' });
  });

  it('una clave única violada en PostgreSQL da 409', () => {
    const e = new QueryFailedError('INSERT', [], Object.assign(new Error('dup'), { code: '23505' }));
    expect(filtro.traducir(e).status).toBe(409);
  });

  it('el bloqueo optimista da 409', () => {
    expect(filtro.traducir(new OptimisticLockVersionMismatchError('Alerta', 1, 2)).status).toBe(409);
  });

  it('las HttpException de Nest mantienen su status', () => {
    expect(filtro.traducir(new NotFoundException()).status).toBe(404);
  });

  it('cualquier otro error da 500 sin filtrar el detalle', () => {
    const p = filtro.traducir(new Error('contraseña=secreta'));
    expect(p.status).toBe(500);
    expect(JSON.stringify(p)).not.toContain('secreta');
  });
});
