import { ForenseVerificacionSchema, type ForenseVerificacion } from '@siem/shared';

import { http } from './http.js';

export async function verificarCadena(): Promise<ForenseVerificacion> {
  const { data } = await http.get('/forensics/verify');
  return ForenseVerificacionSchema.parse(data);
}
