import { EventoSchema, paginado, type Evento, type Paginado } from '@siem/shared';

import { http } from './http.js';

// Filtros de la vista de Eventos (todos opcionales; los vacíos no se envían).
export interface FiltrosEventos {
  host: string;
  usuario: string;
  src_ip: string;
  event_type: string;
  desde: string;
  hasta: string;
}

const EventosPaginadoSchema = paginado(EventoSchema);

export async function listarEventos(
  filtros: FiltrosEventos,
  pagina: number,
  tamano: number,
): Promise<Paginado<Evento>> {
  const params: Record<string, string | number> = { pagina, tamano };
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== '') params[clave] = valor;
  }
  const { data } = await http.get('/events', { params });
  return EventosPaginadoSchema.parse(data);
}
