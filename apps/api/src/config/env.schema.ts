import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGIN: z.string().optional(),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().default(5432),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().default(6379),
  // Firma HS256 de los access tokens. Mínimo 32 bytes (openssl rand -base64 48).
  SECRETO_JWT: z.string().min(32),
  ACCESS_TTL_SEG: z.coerce.number().int().min(60).default(600),
  REFRESH_TTL_DIAS: z.coerce.number().int().min(1).default(7),
  MAX_SESIONES: z.coerce.number().int().min(1).default(3),
  // Clave HMAC de la cadena forense. No se rota sin re-sellar (docs/09). Mínimo 32 bytes.
  CLAVE_FORENSE: z.string().min(32),
  REGLAS_DIR: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});
export type Env = z.infer<typeof EnvSchema>;
