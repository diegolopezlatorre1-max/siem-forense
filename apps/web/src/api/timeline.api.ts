import { type LineaTiempo, LineaTiempoSchema } from '@siem/shared';

import { http } from './http.js';

// Filtros de la vista Línea de tiempo. desde/hasta vienen de <input type="datetime-local">
// (hora local, sin zona) y se envían en ISO UTC para que no dependan de la zona del servidor.
export interface FiltrosLineaTiempo {
  host: string;
  usuario: string;
  src_ip: string;
  desde: string;
  hasta: string;
}

export async function consultarLineaTiempo(filtros: FiltrosLineaTiempo): Promise<LineaTiempo> {
  const params: Record<string, string> = {
    desde: new Date(filtros.desde).toISOString(),
    hasta: new Date(filtros.hasta).toISOString(),
  };
  for (const clave of ['host', 'usuario', 'src_ip'] as const) {
    const valor = filtros[clave].trim();
    if (valor !== '') params[clave] = valor;
  }
  const { data } = await http.get('/timeline', { params });
  return LineaTiempoSchema.parse(data);
}
