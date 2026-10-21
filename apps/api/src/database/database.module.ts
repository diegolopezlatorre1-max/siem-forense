import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigService } from '../config/config.service.js';
import { opcionesBd } from './opciones.js';

export const DatabaseModule = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (c: ConfigService) => ({ ...opcionesBd(c.entorno), retryAttempts: 3 }),
});
