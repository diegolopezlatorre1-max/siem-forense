import 'reflect-metadata';

import { RolSchema } from '@siem/shared';
import { hash } from 'argon2';

import dataSource from '../database/data-source.js';
import { UsuarioEntity } from '../modules/auth/usuario.entity.js';

// Uso: pnpm --filter api usuario:crear <usuario> <clave> [rol]  (rol: admin|analista|auditor, por defecto admin)
const [usuario, clave, rolArg] = process.argv.slice(2);
if (!usuario || !clave) {
  console.error('Uso: usuario:crear <usuario> <clave> [rol]');
  process.exit(1);
}
const rol = RolSchema.parse(rolArg ?? 'admin');

await dataSource.initialize();
try {
  const u = await dataSource.getRepository(UsuarioEntity).save({
    usuario,
    clave_hash: await hash(clave),
    rol,
    activo: true,
  });
  console.log(`Usuario "${u.usuario}" (rol ${u.rol}) creado con id ${u.id}.`);
} finally {
  await dataSource.destroy();
}
