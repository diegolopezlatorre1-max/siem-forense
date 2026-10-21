import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { type Regla, ReglaSchema } from '@siem/shared';
import { parse } from 'yaml';
import { z } from 'zod';

// Puerto de app/detection/reglas.py: la lista OBLIGATORIOS pasa a ser ReglaSchema.

export class ReglaInvalidaError extends Error {}

export async function cargarRegla(ruta: string): Promise<Regla> {
  const nombre = ruta.split(/[\\/]/).pop() ?? ruta;
  let contenido: unknown;
  try {
    contenido = parse(await readFile(ruta, 'utf8'));
  } catch (e) {
    throw new ReglaInvalidaError(`${nombre}: YAML inválido (${(e as Error).message})`);
  }
  const resultado = ReglaSchema.safeParse(contenido);
  if (!resultado.success) {
    throw new ReglaInvalidaError(`${nombre}:\n${z.prettifyError(resultado.error)}`);
  }
  return resultado.data;
}

export async function cargarReglas(carpeta: string): Promise<Regla[]> {
  const archivos = (await readdir(carpeta)).filter((a) => a.endsWith('.yml')).sort();
  const reglas = await Promise.all(archivos.map((a) => cargarRegla(join(carpeta, a))));
  const vistas = new Set<string>();
  for (const r of reglas) {
    if (vistas.has(r.id)) throw new ReglaInvalidaError(`id de regla repetido: ${r.id}`);
    vistas.add(r.id);
  }
  return reglas;
}
