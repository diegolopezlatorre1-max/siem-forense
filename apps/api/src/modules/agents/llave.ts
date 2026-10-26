import { randomBytes } from 'node:crypto';

// Formato de la llave de agente: siem_<prefijo 8 hex>_<secreto>.
// El prefijo se guarda en claro para buscar el agente; el secreto solo como hash Argon2id.
const FORMATO = /^siem_([0-9a-f]{8})_([A-Za-z0-9_-]{43})$/;

export interface LlaveGenerada {
  llave: string;
  prefijo: string;
}

export function generarLlave(): LlaveGenerada {
  const prefijo = randomBytes(4).toString('hex');
  return { prefijo, llave: `siem_${prefijo}_${randomBytes(32).toString('base64url')}` };
}

export function prefijoDe(llave: string): string | null {
  return FORMATO.exec(llave)?.[1] ?? null;
}
