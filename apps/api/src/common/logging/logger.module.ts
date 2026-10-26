import { LoggerModule as PinoModule } from 'nestjs-pino';

import { ConfigService } from '../../config/config.service.js';
import { correlationIdActual } from '../contexto.js';
import { CABECERA_CORRELACION } from '../middleware/correlation-id.middleware.js';

const REDACTAR = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-agent-key"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.clave',
];

// Logs JSON con correlationId en cada línea (HTTP y worker), ver docs/05-backend.md.
export const LoggerModule = PinoModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    pinoHttp: {
      level: config.get('LOG_LEVEL'),
      redact: REDACTAR,
      genReqId: (req) => String(req.headers[CABECERA_CORRELACION] ?? ''),
      mixin: () => {
        const correlationId = correlationIdActual();
        return correlationId ? { correlationId } : {};
      },
      ...(config.esProduccion ? {} : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
    },
  }),
});
