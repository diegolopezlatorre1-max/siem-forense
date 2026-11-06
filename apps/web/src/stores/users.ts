import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { CrearUsuario, Problem, UsuarioPublico } from '@siem/shared';

import { extraerProblem } from '../api/http.js';
import { crearUsuario, listarUsuarios } from '../api/users.api.js';

type Estado = 'idle' | 'loading' | 'success' | 'error';

// Store normalizado (F2 de docs/06-frontend.md). Solo lo usa el admin.
export const useUsersStore = defineStore('users', () => {
  const byId = ref<Record<number, UsuarioPublico>>({});
  const allIds = ref<number[]>([]);
  const status = ref<Estado>('idle');
  const error = ref<Problem | null>(null);
  const creando = ref(false);
  const errorCrear = ref<Problem | null>(null);

  const lista = computed<UsuarioPublico[]>(() =>
    allIds.value.map((id) => byId.value[id]).filter((u): u is UsuarioPublico => u !== undefined),
  );

  function upsert(u: UsuarioPublico): void {
    byId.value = { ...byId.value, [u.id]: u };
    if (!allIds.value.includes(u.id)) allIds.value = [...allIds.value, u.id];
  }

  async function cargar(): Promise<void> {
    status.value = 'loading';
    error.value = null;
    try {
      const usuarios = await listarUsuarios();
      byId.value = Object.fromEntries(usuarios.map((u) => [u.id, u]));
      allIds.value = usuarios.map((u) => u.id);
      status.value = 'success';
    } catch (e) {
      error.value = extraerProblem(e);
      status.value = 'error';
    }
  }

  // Devuelve el usuario creado, o null si falló (el Problem queda en errorCrear; 409 = repetido).
  async function crear(datos: CrearUsuario): Promise<UsuarioPublico | null> {
    creando.value = true;
    errorCrear.value = null;
    try {
      const u = await crearUsuario(datos);
      upsert(u);
      return u;
    } catch (e) {
      errorCrear.value = extraerProblem(e);
      return null;
    } finally {
      creando.value = false;
    }
  }

  return { byId, allIds, status, error, creando, errorCrear, lista, cargar, crear };
});
