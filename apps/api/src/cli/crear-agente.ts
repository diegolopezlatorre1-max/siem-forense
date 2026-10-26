import 'reflect-metadata';

import { hash } from 'argon2';

import dataSource from '../database/data-source.js';
import { AgenteEntity } from '../modules/agents/agente.entity.js';
import { generarLlave } from '../modules/agents/llave.js';

// Uso: pnpm --filter api agente:crear <nombre> [host]
// La llave se imprime UNA sola vez; en la base solo queda su hash.
const [nombre, host] = process.argv.slice(2);
if (!nombre) {
  console.error('Uso: agente:crear <nombre> [host]');
  process.exit(1);
}

await dataSource.initialize();
try {
  const { llave, prefijo } = generarLlave();
  const agente = await dataSource.getRepository(AgenteEntity).save({
    nombre,
    host: host ?? null,
    prefijo_llave: prefijo,
    llave_hash: await hash(llave),
  });
  console.log(`Agente "${agente.nombre}" creado con id ${agente.id}.`);
  console.log('Llave (guárdala en docs/privado/, no se vuelve a mostrar):');
  console.log(llave);
} finally {
  await dataSource.destroy();
}
