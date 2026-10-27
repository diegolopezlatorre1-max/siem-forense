import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type CrearUsuario,
  CrearUsuarioSchema,
  ProblemSchema,
  type UsuarioPublico,
  UsuarioPublicoSchema,
} from '@siem/shared';
import { hash } from 'argon2';
import { z } from 'zod';

import { Roles } from '../../common/auth/decoradores.js';
import { esquema } from '../../common/openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { UsuarioEntity } from '../auth/usuario.entity.js';
import { USUARIOS_REPO, type UsuariosRepository } from '../auth/usuarios.repository.js';

const publico = (u: UsuarioEntity): UsuarioPublico => ({ id: u.id, usuario: u.usuario, rol: u.rol });

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(@Inject(USUARIOS_REPO) private readonly usuarios: UsuariosRepository) {}

  @Get()
  @Roles('admin')
  @ApiResponse({ status: 200, schema: esquema(z.array(UsuarioPublicoSchema)) })
  @ApiResponse({ status: 403, description: 'Solo admin', schema: esquema(ProblemSchema) })
  async listar(): Promise<UsuarioPublico[]> {
    return (await this.usuarios.listar()).map(publico);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ schema: esquema(CrearUsuarioSchema, 'input') })
  @ApiResponse({ status: 201, schema: esquema(UsuarioPublicoSchema) })
  @ApiResponse({ status: 409, description: 'usuario repetido', schema: esquema(ProblemSchema) })
  async crear(@Body(new ZodValidationPipe(CrearUsuarioSchema)) dto: CrearUsuario): Promise<UsuarioPublico> {
    const u = await this.usuarios.crear({ usuario: dto.usuario, clave_hash: await hash(dto.clave), rol: dto.rol });
    return publico(u);
  }
}
