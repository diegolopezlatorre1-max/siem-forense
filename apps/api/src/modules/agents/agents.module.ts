import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentKeyGuard } from '../../common/guards/agent-key.guard.js';
import { AgenteEntity } from './agente.entity.js';
import { AGENTES_REPO, TypeOrmAgentesRepository } from './agentes.repository.js';
import { AgentesService } from './agentes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AgenteEntity])],
  providers: [AgentesService, AgentKeyGuard, { provide: AGENTES_REPO, useClass: TypeOrmAgentesRepository }],
  exports: [AgentesService, AgentKeyGuard],
})
export class AgentsModule {}
