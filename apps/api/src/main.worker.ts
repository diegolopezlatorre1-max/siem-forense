import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { oSalir } from './common/arranque.js';
import { contexto } from './common/contexto.js';
import { DeteccionService } from './modules/detection/deteccion.service.js';
import { WorkerModule } from './worker.module.js';

const app = await oSalir(() =>
  NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true, abortOnError: false }),
);
const logger = app.get(Logger);
app.useLogger(logger);
app.enableShutdownHooks();

// Si Redis estuvo caído, hubo eventos sin evaluar: se reevalúa la ventana reciente (ADR 0004).
const deteccion = app.get(DeteccionService);
await contexto.run({ correlationId: 'arranque-worker' }, async () => {
  for (const tipo of deteccion.tiposVigilados) await deteccion.evaluarTipo(tipo);
});
logger.log('Worker de detección listo');
