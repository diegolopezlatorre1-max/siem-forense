import { type CrearUsuario, ListaUsuariosSchema, type UsuarioPublico, UsuarioPublicoSchema } from '@siem/shared';

import { http } from './http.js';

// GET /users (solo admin).
export async function listarUsuarios(): Promise<UsuarioPublico[]> {
  const { data } = await http.get('/users');
  return ListaUsuariosSchema.parse(data);
}

// POST /users (solo admin). 409 si el nombre de usuario ya existe.
export async function crearUsuario(datos: CrearUsuario): Promise<UsuarioPublico> {
  const { data } = await http.post('/users', datos);
  return UsuarioPublicoSchema.parse(data);
}
