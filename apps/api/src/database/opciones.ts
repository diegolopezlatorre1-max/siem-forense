import type { DataSourceOptions } from 'typeorm';

import type { Env } from '../config/env.schema.js';
import { AgenteEntity } from '../modules/agents/agente.entity.js';
import { AlertaEntity } from '../modules/alerts/alerta.entity.js';
import { RefreshTokenEntity } from '../modules/auth/refresh-token.entity.js';
import { UsuarioEntity } from '../modules/auth/usuario.entity.js';
import { EventoEntity } from '../modules/events/evento.entity.js';
import { EslabonEntity } from '../modules/forensics/eslabon.entity.js';
import { EsquemaBase1760900000000 } from './migrations/1760900000000-EsquemaBase.js';
import { Agentes1760900100000 } from './migrations/1760900100000-Agentes.js';
import { Usuarios1760900200000 } from './migrations/1760900200000-Usuarios.js';
import { CadenaForense1760900300000 } from './migrations/1760900300000-CadenaForense.js';

export const ENTIDADES = [EventoEntity, AlertaEntity, AgenteEntity, UsuarioEntity, RefreshTokenEntity, EslabonEntity];
export const MIGRACIONES = [
  EsquemaBase1760900000000,
  Agentes1760900100000,
  Usuarios1760900200000,
  CadenaForense1760900300000,
];

// synchronize siempre en false: el esquema solo cambia con migraciones (docs/07-datos.md).
export const opcionesBd = (env: Env): DataSourceOptions => ({
  type: 'postgres',
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  entities: ENTIDADES,
  migrations: MIGRACIONES,
  synchronize: false,
  migrationsRun: false,
});
