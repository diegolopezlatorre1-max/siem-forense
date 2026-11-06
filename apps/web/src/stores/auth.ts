import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Login, Rol, UsuarioPublico } from '@siem/shared';

import { apiLogin, apiLogout, apiMe, apiRefresh } from '../api/auth.api.js';

// El accessToken vive SOLO en memoria (nunca localStorage): tras recargar la
// página se recupera con la cookie de refresh vía restaurarSesion (F2/F3).
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null);
  const usuario = ref<UsuarioPublico | null>(null);

  const estaAutenticado = computed(() => usuario.value !== null);
  const rol = computed<Rol | null>(() => usuario.value?.rol ?? null);

  async function login(credenciales: Login): Promise<void> {
    const respuesta = await apiLogin(credenciales);
    accessToken.value = respuesta.accessToken;
    usuario.value = respuesta.usuario;
  }

  // Rehidrata la sesión desde la cookie de refresh. Lanza si ya no es válida.
  async function restaurarSesion(): Promise<void> {
    const { accessToken: nuevo } = await apiRefresh();
    accessToken.value = nuevo;
    if (usuario.value === null) usuario.value = await apiMe();
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout();
    } finally {
      limpiarSesion();
    }
  }

  function limpiarSesion(): void {
    accessToken.value = null;
    usuario.value = null;
  }

  return { accessToken, usuario, estaAutenticado, rol, login, restaurarSesion, logout, limpiarSesion };
});
