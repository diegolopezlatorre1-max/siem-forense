import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type Alerta,
  AlertaSchema,
  type AlertasQuery,
  AlertasQuerySchema,
  type AsignarAlerta,
  AsignarAlertaSchema,
  type CambiarEstadoAlerta,
  CambiarEstadoAlertaSchema,
  type EstadoAlerta,
  paginado,
  type Paginado,
  type Severidad,
} from '@siem/shared';

import { Autenticado, Roles } from '../../common/auth/decoradores.js';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import { NoEncontradoError } from '../../common/errors/dominio.js';
import { esquema } from '../../common/openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { ClaimsAcceso } from '../auth/tokens.service.js';
import type { AlertaEntity } from './alerta.entity.js';
import { AlertasService } from './alertas.service.js';
import { ALERTAS_REPO, type AlertasRepository } from './alertas.repository.js';

const aDto = (a: AlertaEntity): Alerta => ({
  ...a,
  severidad: a.severidad as Severidad,
  estado: a.estado as EstadoAlerta,
  ts: a.ts.toISOString(),
  creada_en: a.creada_en.toISOString(),
});

@ApiTags('alertas')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(
    @Inject(ALERTAS_REPO) private readonly alertas: AlertasRepository,
    private readonly servicio: AlertasService,
  ) {}

  @Get()
  @Autenticado()
  @ApiQuery({ name: 'estado', required: false, schema: { type: 'string', enum: ['abierta', 'en_progreso', 'cerrada', 'falso_positivo'] } })
  @ApiQuery({ name: 'severidad', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } })
  @ApiQuery({ name: 'regla_id', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'pagina', required: false, schema: { type: 'integer', minimum: 1, default: 1 } })
  @ApiQuery({ name: 'tamano', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } })
  @ApiResponse({ status: 200, schema: esquema(paginado(AlertaSchema)) })
  async listar(@Query(new ZodValidationPipe(AlertasQuerySchema)) q: AlertasQuery): Promise<Paginado<Alerta>> {
    const [filas, total] = await this.alertas.listar(
      { estado: q.estado, severidad: q.severidad, regla_id: q.regla_id },
      q.pagina,
      q.tamano,
    );
    return { items: filas.map(aDto), total, pagina: q.pagina, tamano: q.tamano };
  }

  @Get(':id')
  @Autenticado()
  @ApiResponse({ status: 200, schema: esquema(AlertaSchema) })
  async obtener(@Param('id', ParseIntPipe) id: number): Promise<Alerta> {
    const alerta = await this.servicio.obtener(id);
    if (!alerta) throw new NoEncontradoError('Alerta no encontrada');
    return aDto(alerta);
  }

  @Post(':id/asignar')
  @Roles('admin', 'analista')
  @ApiResponse({ status: 200, schema: esquema(AlertaSchema) })
  async asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AsignarAlertaSchema)) cuerpo: AsignarAlerta,
    @UsuarioActual() usuario: ClaimsAcceso,
  ): Promise<Alerta> {
    return aDto(await this.servicio.asignar(id, usuario, cuerpo.usuarioId, cuerpo.version));
  }

  @Patch(':id')
  @Roles('admin', 'analista')
  @ApiResponse({ status: 200, schema: esquema(AlertaSchema) })
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(CambiarEstadoAlertaSchema)) cuerpo: CambiarEstadoAlerta,
    @UsuarioActual() usuario: ClaimsAcceso,
  ): Promise<Alerta> {
    return aDto(await this.servicio.cambiarEstado(id, usuario, cuerpo.estado, cuerpo.version));
  }
}
