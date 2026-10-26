import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';

import { correlationIdActual } from '../contexto.js';
import { CABECERA_CORRELACION, correlationIdMiddleware } from './correlation-id.middleware.js';

function ejecutar(recibido?: string): { respuesta: string | undefined; enContexto: string | undefined } {
  const headers: Record<string, string> = recibido ? { [CABECERA_CORRELACION]: recibido } : {};
  const req = { headers, header: (n: string) => headers[n] } as unknown as Request;
  let respuesta: string | undefined;
  const res = { setHeader: (_n: string, v: string) => (respuesta = v) } as unknown as Response;
  let enContexto: string | undefined;
  const next: NextFunction = () => (enContexto = correlationIdActual());
  correlationIdMiddleware(req, res, next);
  return { respuesta, enContexto };
}

describe('correlationIdMiddleware', () => {
  it('reutiliza un UUID recibido y lo deja en el contexto', () => {
    const id = '4f0c2a1e-8b7d-4c3a-9e2f-1a2b3c4d5e6f';
    expect(ejecutar(id)).toEqual({ respuesta: id, enContexto: id });
  });

  it('genera uno nuevo si el recibido no es un UUID', () => {
    const { respuesta, enContexto } = ejecutar('<script>');
    expect(respuesta).toMatch(/^[0-9a-f-]{36}$/);
    expect(enContexto).toBe(respuesta);
  });
});
