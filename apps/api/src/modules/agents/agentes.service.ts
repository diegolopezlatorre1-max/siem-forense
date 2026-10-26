import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { verify } from 'argon2';

import { AGENTES_REPO, type AgentesRepository } from './agentes.repository.js';
import { prefijoDe } from './llave.js';

// Verificar Argon2 en cada evento sería caro; una llave ya verificada se recuerda un rato.
const CACHE_MS = 60_000;

@Injectable()
export class AgentesService {
  private readonly verificadas = new Map<string, { agenteId: number; expira: number }>();

  constructor(@Inject(AGENTES_REPO) private readonly agentes: AgentesRepository) {}

  /** Devuelve el id del agente dueño de la llave, o null si no es válida. */
  async autenticar(llave: string): Promise<number | null> {
    const huella = createHash('sha256').update(llave).digest('hex');
    const enCache = this.verificadas.get(huella);
    if (enCache && enCache.expira > Date.now()) return enCache.agenteId;

    const prefijo = prefijoDe(llave);
    if (!prefijo) return null;
    const agente = await this.agentes.buscarActivoPorPrefijo(prefijo);
    if (!agente || !(await verify(agente.llave_hash, llave))) return null;

    this.verificadas.set(huella, { agenteId: agente.id, expira: Date.now() + CACHE_MS });
    return agente.id;
  }
}
