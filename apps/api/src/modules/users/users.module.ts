import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [AuthModule], // reutiliza USUARIOS_REPO
  controllers: [UsersController],
})
export class UsersModule {}
