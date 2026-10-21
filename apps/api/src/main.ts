import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { oSalir } from './common/arranque.js';
import { configurarApp } from './configurar-app.js';
import { ConfigService } from './config/config.service.js';

const app = await oSalir(() =>
  NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false, abortOnError: false }),
);
app.useLogger(app.get(Logger));
configurarApp(app);
app.enableShutdownHooks();
await app.listen(app.get(ConfigService).get('PORT'));
