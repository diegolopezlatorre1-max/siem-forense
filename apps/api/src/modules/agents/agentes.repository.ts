import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AgenteEntity } from './agente.entity.js';

export const AGENTES_REPO = Symbol('AGENTES_REPO');

export interface AgentesRepository {
  buscarActivoPorPrefijo(prefijo: string): Promise<AgenteEntity | null>;
}

@Injectable()
export class TypeOrmAgentesRepository implements AgentesRepository {
  constructor(@InjectRepository(AgenteEntity) private readonly repo: Repository<AgenteEntity>) {}

  buscarActivoPorPrefijo(prefijo: string): Promise<AgenteEntity | null> {
    return this.repo.findOneBy({ prefijo_llave: prefijo, activo: true });
  }
}
