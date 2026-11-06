import { getQueueToken } from '@nestjs/bullmq';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import helmet from 'helmet';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { AgentesService } from '../modules/agents/agentes.service.js';
import { AlertsController } from '../modules/alerts/alerts.controller.js';
import { ALERTAS_REPO } from '../modules/alerts/alertas.repository.js';
import { AlertasService } from '../modules/alerts/alertas.service.js';
import { COLA_DETECCION } from '../modules/detection/cola.js';
import { EventsController } from '../modules/events/events.controller.js';
import { EventsQueryController } from '../modules/events/events-query.controller.js';
import { EVENTOS_REPO } from '../modules/events/eventos.repository.js';
import { IngestaService } from '../modules/events/ingesta.service.js';
import { HealthController } from '../modules/health/health.controller.js';
import { TimelineController } from '../modules/timeline/timeline.controller.js';
import { TimelineService } from '../modules/timeline/timeline.service.js';
import { montarOpenApi } from './openapi.js';

describe('OpenAPI', () => {
  it('documenta las rutas con los schemas de packages/shared', { timeout: 30_000 }, async () => {
    const modulo = await Test.createTestingModule({
      controllers: [HealthController, EventsController, EventsQueryController, AlertsController, TimelineController],
      providers: [
        { provide: getDataSourceToken(), useValue: {} },
        { provide: getQueueToken(COLA_DETECCION), useValue: {} },
        { provide: IngestaService, useValue: {} },
        { provide: AgentesService, useValue: {} },
        { provide: ALERTAS_REPO, useValue: {} },
        AlertasService,
        { provide: EVENTOS_REPO, useValue: {} },
        TimelineService,
      ],
    }).compile();
    const app = modulo.createNestApplication();
    app.use(helmet());
    app.setGlobalPrefix('api/v1');
    montarOpenApi(app);
    await app.init();

    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const ingesta = doc.paths['/api/v1/ingest']?.post;
    expect(ingesta?.responses).toHaveProperty('409');
    expect(JSON.stringify(ingesta?.requestBody)).toContain('login_failed');
    expect(doc.paths).toHaveProperty(['/api/v1/alerts']);
    expect(doc.paths).toHaveProperty(['/api/v1/events']);
    expect(doc.paths).toHaveProperty(['/api/v1/health']);
    expect(JSON.stringify(doc.paths['/api/v1/timeline']?.get?.responses)).toContain('truncada');
    const servidor = app.getHttpServer();
    await request(servidor).get('/api/docs/').expect(200);
    const json = await request(servidor).get('/api/docs-json').expect(200);
    expect(json.body.paths).toHaveProperty(['/api/v1/ingest']);
    await app.close();
  });
});
