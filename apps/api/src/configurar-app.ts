import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { correlationIdMiddleware } from './common/middleware/correlation-id.middleware.js';
import { ConfigService } from './config/config.service.js';

// Compartido por main.ts y las pruebas e2e.
export function configurarApp(app: NestExpressApplication): void {
  // Antes que cualquier otro middleware, para que los logs ya tengan el correlationId.
  app.use(correlationIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '64kb' });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
  const origen = app.get(ConfigService).get('CORS_ORIGIN');
  if (origen) app.enableCors({ origin: origen, credentials: true });
}
