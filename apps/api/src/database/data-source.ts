import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { cargarEnv } from '../config/config.service.js';
import { opcionesBd } from './opciones.js';

// Lo usa la CLI de TypeORM: pnpm --filter api migration:run
export default new DataSource(opcionesBd(cargarEnv()));
