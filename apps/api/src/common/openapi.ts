import type { INestApplication } from '@nestjs/common';
import { type ApiResponseSchemaHost, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { z } from 'zod';

type SchemaObject = ApiResponseSchemaHost['schema'];

// El contrato sale de los mismos schemas Zod de packages/shared: no se duplica en decoradores.
export const esquema = (s: z.ZodType, io: 'input' | 'output' = 'output'): SchemaObject =>
  z.toJSONSchema(s, { target: 'openapi-3.0', io, unrepresentable: 'any' }) as SchemaObject;

// Solo en desarrollo (docs/08-api.md): /api/docs y /api/docs-json.
export function montarOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('SIEM Forense')
    .setVersion('1')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Agent-Key' }, 'agente')
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config));
}
