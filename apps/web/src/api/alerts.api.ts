import { AlertaSchema, type Alerta, type EstadoAlerta, type Paginado, paginado } from '@siem/shared';

import { http } from './http.js';

// Filtros de la vista de Alertas (vacíos no se envían).
export interface FiltrosAlertas {
  estado: string;
  severidad: string;
  regla_id: string;
}

const AlertasPaginadoSchema = paginado(AlertaSchema);

export async function listarAlertas(
  filtros: FiltrosAlertas,
  pagina: number,
  tamano: number,
): Promise<Paginado<Alerta>> {
  const params: Record<string, string | number> = { pagina, tamano };
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== '') params[clave] = valor;
  }
  const { data } = await http.get('/alerts', { params });
  return AlertasPaginadoSchema.parse(data);
}

// Asigna la alerta a un usuario. `version` es la que vio el cliente (bloqueo optimista: 409 si no coincide).
export async function asignarAlerta(id: number, usuarioId: number, version: number): Promise<Alerta> {
  const { data } = await http.post(`/alerts/${id}/asignar`, { usuarioId, version });
  return AlertaSchema.parse(data);
}

// Cambia el estado de la alerta (mismo bloqueo optimista).
export async function cambiarEstadoAlerta(id: number, estado: EstadoAlerta, version: number): Promise<Alerta> {
  const { data } = await http.patch(`/alerts/${id}`, { estado, version });
  return AlertaSchema.parse(data);
}
