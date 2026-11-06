import {
  LoginRespuestaSchema,
  RefreshRespuestaSchema,
  UsuarioPublicoSchema,
  type Login,
  type LoginRespuesta,
  type RefreshRespuesta,
  type UsuarioPublico,
} from '@siem/shared';

import { http } from './http.js';

// Cada función valida la respuesta con su schema de @siem/shared antes de
// entregarla al store (F1 de docs/06-frontend.md): si el contrato cambia, falla aquí.

export async function apiLogin(credenciales: Login): Promise<LoginRespuesta> {
  const { data } = await http.post('/auth/login', credenciales, { sinRefresh: true });
  return LoginRespuestaSchema.parse(data);
}

export async function apiRefresh(): Promise<RefreshRespuesta> {
  const { data } = await http.post('/auth/refresh', undefined, { sinRefresh: true });
  return RefreshRespuestaSchema.parse(data);
}

export async function apiLogout(): Promise<void> {
  await http.post('/auth/logout');
}

export async function apiMe(): Promise<UsuarioPublico> {
  const { data } = await http.get('/auth/me');
  return UsuarioPublicoSchema.parse(data);
}
