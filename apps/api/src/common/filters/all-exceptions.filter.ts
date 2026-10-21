import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Problem } from '@siem/shared';
import type { Request, Response } from 'express';
import { OptimisticLockVersionMismatchError, QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

import { correlationIdActual } from '../contexto.js';
import { ErrorDominio } from '../errors/dominio.js';

const BASE_TIPO = 'https://siem.local/errores/';
const PG_CLAVE_UNICA = '23505';

type Cuerpo = Omit<Problem, 'instance' | 'correlationId'>;

const problema = (status: number, tipo: string, title: string, detail?: string): Cuerpo => ({
  type: BASE_TIPO + tipo,
  title,
  status,
  ...(detail ? { detail } : {}),
});

const esClaveUnica = (e: QueryFailedError): boolean =>
  (e.driverError as { code?: unknown } | undefined)?.code === PG_CLAVE_UNICA;

// Toda respuesta de error sale como application/problem+json (RFC 7807), ver docs/05-backend.md.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const cuerpo = this.traducir(error);
    if (cuerpo.status >= 500) this.logger.error({ err: error }, 'Error no controlado');

    res
      .status(cuerpo.status)
      .type('application/problem+json')
      .json({ ...cuerpo, instance: req.originalUrl, correlationId: correlationIdActual() } satisfies Problem);
  }

  traducir(error: unknown): Cuerpo {
    if (error instanceof ZodError) {
      return {
        ...problema(400, 'validacion', 'Datos inválidos'),
        errors: error.issues.map((i) => ({ ruta: i.path.join('.'), mensaje: i.message })),
      };
    }
    if (error instanceof ErrorDominio) {
      return problema(error.status, error.tipo, error.titulo, error.detalle);
    }
    if (error instanceof OptimisticLockVersionMismatchError) {
      return problema(409, 'conflicto', 'El recurso cambió', 'La versión enviada no es la actual');
    }
    if (error instanceof QueryFailedError && esClaveUnica(error)) {
      return problema(409, 'conflicto', 'Registro duplicado');
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const titulo = status === HttpStatus.NOT_FOUND ? 'Recurso no encontrado' : error.message;
      return problema(status, `http-${status}`, titulo);
    }
    return problema(500, 'interno', 'Error interno');
  }
}
