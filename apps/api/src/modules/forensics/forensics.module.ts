import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EslabonEntity } from './eslabon.entity.js';
import { ForenseService } from './forense.service.js';
import { ForensicsController } from './forensics.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([EslabonEntity])],
  controllers: [ForensicsController],
  providers: [ForenseService],
  exports: [ForenseService],
})
export class ForensicsModule {}
