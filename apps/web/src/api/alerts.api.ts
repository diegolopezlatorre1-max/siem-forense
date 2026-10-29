import { AlertaSchema, paginado, type Alerta, type Paginado } from '@siem/shared';

import { http } from './http.js';

// Filtros de la vista de Alertas (vacíos no se envían). El filtro por estado y
// la asignación llegan en el Sprint 6 (la tabla aún no tiene esas columnas).
export interface FiltrosAlertas {
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
