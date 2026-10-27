import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenEntity } from './refresh-token.entity.js';
import { REFRESH_REPO, TypeOrmRefreshTokensRepository } from './refresh-tokens.repository.js';
import { CACHE_SESIONES, RedisCacheSesiones } from './sesiones.cache.js';
import { TokensService } from './tokens.service.js';
import { UsuarioEntity } from './usuario.entity.js';
import { USUARIOS_REPO, TypeOrmUsuariosRepository } from './usuarios.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioEntity, RefreshTokenEntity])],
  controllers: [AuthController],
  providers: [
    TokensService,
    AuthService,
    JwtAuthGuard,
    { provide: USUARIOS_REPO, useClass: TypeOrmUsuariosRepository },
    { provide: REFRESH_REPO, useClass: TypeOrmRefreshTokensRepository },
    { provide: CACHE_SESIONES, useClass: RedisCacheSesiones },
  ],
  exports: [TokensService, AuthService, JwtAuthGuard, USUARIOS_REPO],
})
export class AuthModule {}
