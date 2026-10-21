import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { type Env, EnvSchema } from './env.schema.js';

// El .env vive en la raíz del repo (lo comparte docker compose).
const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));

export function cargarEnv(fuente: NodeJS.ProcessEnv = process.env): Env {
  const archivo = `${RAIZ}.env`;
  if (fuente === process.env && existsSync(archivo)) process.loadEnvFile(archivo);
  const resultado = EnvSchema.safeParse(fuente);
  if (!resultado.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(resultado.error)}`);
  }
  return resultado.data;
}

@Injectable()
export class ConfigService {
  private readonly env: Env;

  constructor() {
    this.env = cargarEnv();
  }

  get<K extends keyof Env>(clave: K): Env[K] {
    return this.env[clave];
  }

  get entorno(): Readonly<Env> {
    return this.env;
  }

  get esProduccion(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get reglasDir(): string {
    return this.env.REGLAS_DIR ?? `${RAIZ}rules`;
  }
}
