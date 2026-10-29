import { Inject, Injectable } from '@nestjs/common';
import type { EstadoAlerta } from '@siem/shared';

import { AccesoDenegadoError, ConflictoError, NoEncontradoError } from '../../common/errors/dominio.js';
import type { ClaimsAcceso } from '../auth/tokens.service.js';
import type { AlertaEntity } from './alerta.entity.js';
import { alertaPuedeAsignar, alertaPuedeModificar } from './alerta.policy.js';
import { ALERTAS_REPO, type AlertasRepository } from './alertas.repository.js';

@Injectable()
export class AlertasService {
  constructor(@Inject(ALERTAS_REPO) private readonly alertas: AlertasRepository) {}

  /** Asigna la alerta a un usuario. ABAC: el analista solo a sí mismo. Bloqueo optimista por `version`. */
  async asignar(id: number, usuario: ClaimsAcceso, usuarioId: number, version: number): Promise<AlertaEntity> {
    const alerta = await this.alertas.buscarPorId(id);
    if (!alerta) throw new NoEncontradoError('Alerta no encontrada');
    if (!alertaPuedeAsignar(usuario, usuarioId)) {
      throw new AccesoDenegadoError('No puede asignar la alerta a ese usuario');
    }
    return this.aplicar(id, version, { asignada_a: usuarioId });
  }

  /** Cambia el estado. ABAC: el analista solo si la alerta está asignada a él. Bloqueo optimista. */
  async cambiarEstado(id: number, usuario: ClaimsAcceso, estado: EstadoAlerta, version: number): Promise<AlertaEntity> {
    const alerta = await this.alertas.buscarPorId(id);
    if (!alerta) throw new NoEncontradoError('Alerta no encontrada');
    if (!alertaPuedeModificar(usuario, { asignada_a: alerta.asignada_a })) {
      throw new AccesoDenegadoError('No puede modificar una alerta que no tiene asignada');
    }
    return this.aplicar(id, version, { estado });
  }

  obtener(id: number): Promise<AlertaEntity | null> {
    return this.alertas.buscarPorId(id);
  }

  private async aplicar(id: number, version: number, cambios: Parameters<AlertasRepository['actualizarConVersion']>[2]): Promise<AlertaEntity> {
    const actualizada = await this.alertas.actualizarConVersion(id, version, cambios);
    if (!actualizada) throw new ConflictoError('La alerta fue modificada por otra persona', 'Recargue y vuelva a intentarlo');
    return actualizada;
  }
}
