import { createHmac } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { ForenseVerificacion, MotivoForense } from '@siem/shared';
import { DataSource, type EntityManager } from 'typeorm';

import { ConfigService } from '../../config/config.service.js';
import { EslabonEntity } from './eslabon.entity.js';

// Clave fija del bloqueo de aplicación que serializa la escritura de la cadena.
const LOCK_CADENA = 889_271;
const LOTE = 1000;

// Campos sellados (docs/09): el orden de las claves es alfabético y estable.
export interface EventoSellable {
  id: number;
  event_id: string;
  ts: string | Date;
  host: string;
  source: string;
  event_type: string;
  usuario: string | null;
  src_ip: string | null;
  severity: string;
  raw: string;
}

interface FilaCadena extends EventoSellable {
  secuencia: number;
  evento_id: number;
  hash_anterior: string;
  hash: string;
}

@Injectable()
export class ForenseService {
  private readonly logger = new Logger(ForenseService.name);
  private readonly clave: string;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    config: ConfigService,
  ) {
    this.clave = config.get('CLAVE_FORENSE');
  }

  /** Canónico: JSON con las claves en orden alfabético y ts en ISO UTC. */
  canonico(e: EventoSellable): string {
    return JSON.stringify({
      event_id: e.event_id,
      event_type: e.event_type,
      host: e.host,
      raw: e.raw,
      severity: e.severity,
      source: e.source,
      src_ip: e.src_ip ?? null,
      ts: new Date(e.ts).toISOString(),
      usuario: e.usuario ?? null,
    });
  }

  hashGenesis(): string {
    return createHmac('sha256', this.clave).update('GENESIS|siem-forense').digest('hex');
  }

  hashEslabon(hashAnterior: string, secuencia: number, canonico: string): string {
    return createHmac('sha256', this.clave).update(`${hashAnterior}|${secuencia}|${canonico}`).digest('hex');
  }

  /** Sella un evento dentro de la transacción de la ingesta. Devuelve su secuencia. */
  async sellar(em: EntityManager, evento: EventoSellable): Promise<number> {
    await em.query('SELECT pg_advisory_xact_lock($1)', [LOCK_CADENA]);
    const tail = (await em.query('SELECT secuencia, hash FROM cadena_forense ORDER BY secuencia DESC LIMIT 1')) as {
      secuencia: number;
      hash: string;
    }[];
    const prevHash = tail[0] ? tail[0].hash : this.hashGenesis();
    const secuencia = (tail[0] ? Number(tail[0].secuencia) : 0) + 1;
    const hash = this.hashEslabon(prevHash, secuencia, this.canonico(evento));
    await em.insert(EslabonEntity, { secuencia, evento_id: evento.id, hash_anterior: prevHash, hash });
    return secuencia;
  }

  /** Recorre la cadena por secuencia y devuelve el primer fallo, si lo hay. */
  async verificar(): Promise<ForenseVerificacion> {
    let esperado = 1;
    let prevHash = this.hashGenesis();
    let eslabones = 0;

    for (;;) {
      const filas: FilaCadena[] = await this.ds.query(
        `SELECT c.secuencia, c.evento_id, c.hash_anterior, c.hash,
                e.event_id, e.ts, e.host, e.source, e.event_type, e.usuario, e.src_ip, e.severity, e.raw
         FROM cadena_forense c
         LEFT JOIN eventos e ON e.id = c.evento_id
         WHERE c.secuencia >= $1
         ORDER BY c.secuencia ASC
         LIMIT ${LOTE}`,
        [esperado],
      );
      if (filas.length === 0) break;

      for (const f of filas) {
        const secuencia = Number(f.secuencia);
        if (secuencia !== esperado) return this.fallo('eslabon_faltante', esperado, null, eslabones);
        if (!f.event_id) return this.fallo('evento_alterado', secuencia, f.evento_id, eslabones); // evento borrado
        if (f.hash_anterior !== prevHash) return this.fallo('cadena_rota', secuencia, f.evento_id, eslabones);
        if (this.hashEslabon(prevHash, secuencia, this.canonico(f)) !== f.hash) {
          return this.fallo('evento_alterado', secuencia, f.evento_id, eslabones);
        }
        prevHash = f.hash;
        esperado++;
        eslabones++;
      }
    }

    const sinSellar = (await this.ds.query(
      `SELECT e.id FROM eventos e
       LEFT JOIN cadena_forense c ON c.evento_id = e.id
       WHERE c.evento_id IS NULL AND e.id >= (SELECT min(evento_id) FROM cadena_forense)
       ORDER BY e.id ASC LIMIT 1`,
    )) as { id: number }[];
    if (sinSellar[0]) return this.fallo('evento_sin_sellar', null, Number(sinSellar[0].id), eslabones);

    return { integra: true, eslabones };
  }

  private fallo(
    motivo: MotivoForense,
    secuencia: number | null,
    eventoId: number | null,
    eslabones: number,
  ): ForenseVerificacion {
    this.logger.warn({ motivo, secuencia, eventoId }, 'forense.verificacion_fallida');
    return { integra: false, eslabones, primerFallo: { secuencia, eventoId, motivo } };
  }
}
