import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type Login,
  type LoginRespuesta,
  LoginRespuestaSchema,
  LoginSchema,
  ProblemSchema,
  type RefreshRespuesta,
  RefreshRespuestaSchema,
  type UsuarioPublico,
} from '@siem/shared';
import type { CookieOptions, Request, Response } from 'express';

import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator.js';
import { NoAutenticadoError } from '../../common/errors/dominio.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { esquema } from '../../common/openapi.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ConfigService } from '../../config/config.service.js';
import { AuthService } from './auth.service.js';
import type { ClaimsAcceso } from './tokens.service.js';

const COOKIE = 'refresh_token';
const RUTA_COOKIE = '/api/v1/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieBase: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.cookieBase = {
      httpOnly: true,
      secure: config.esProduccion, // sobre HTTP (lab/tests) no se puede exigir Secure
      sameSite: 'strict',
      path: RUTA_COOKIE,
      maxAge: config.get('REFRESH_TTL_DIAS') * 86_400_000,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: esquema(LoginSchema, 'input') })
  @ApiResponse({ status: 200, schema: esquema(LoginRespuestaSchema) })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas', schema: esquema(ProblemSchema) })
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) datos: Login,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginRespuesta> {
    const { refreshToken, ...resto } = await this.auth.login(datos, this.contexto(req));
    res.cookie(COOKIE, refreshToken, this.cookieBase);
    return resto;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, schema: esquema(RefreshRespuestaSchema) })
  @ApiResponse({ status: 401, description: 'Refresh inválido', schema: esquema(ProblemSchema) })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<RefreshRespuesta> {
    const cookies = req.cookies as Record<string, string> | undefined;
    const sesion = await this.auth.refrescar(cookies?.[COOKIE], this.contexto(req));
    res.cookie(COOKIE, sesion.refreshToken, this.cookieBase);
    return { accessToken: sesion.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@UsuarioActual() u: ClaimsAcceso, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(u.sid);
    res.clearCookie(COOKIE, { path: RUTA_COOKIE });
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logoutAll(@UsuarioActual() u: ClaimsAcceso, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logoutAll(u.sub);
    res.clearCookie(COOKIE, { path: RUTA_COOKIE });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, schema: esquema(LoginRespuestaSchema.shape.usuario) })
  async me(@UsuarioActual() u: ClaimsAcceso): Promise<UsuarioPublico> {
    const usuario = await this.auth.obtener(u.sub);
    if (!usuario) throw new NoAutenticadoError('Usuario no disponible');
    return usuario;
  }

  private contexto(req: Request): { ip: string | null; userAgent: string | null } {
    return { ip: req.ip ?? null, userAgent: req.header('user-agent') ?? null };
  }
}
