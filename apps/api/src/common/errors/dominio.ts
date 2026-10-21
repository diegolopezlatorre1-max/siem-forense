// Errores de dominio: los servicios los lanzan y AllExceptionsFilter los traduce a HTTP.
export abstract class ErrorDominio extends Error {
  abstract readonly status: number;
  abstract readonly tipo: string;

  constructor(
    readonly titulo: string,
    readonly detalle?: string,
  ) {
    super(detalle ?? titulo);
    this.name = new.target.name;
  }
}

export class ConflictoError extends ErrorDominio {
  readonly status = 409;
  readonly tipo = 'conflicto';
}

export class NoEncontradoError extends ErrorDominio {
  readonly status = 404;
  readonly tipo = 'no-encontrado';
}

export class NoAutenticadoError extends ErrorDominio {
  readonly status = 401;
  readonly tipo = 'no-autenticado';
}
