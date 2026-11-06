import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Alerta, Problem } from '@siem/shared';

import type { EstadoAlerta } from '@siem/shared';

import { asignarAlerta, cambiarEstadoAlerta, listarAlertas } from '../api/alerts.api.js';
import { extraerProblem } from '../api/http.js';
import { useUiStore } from './ui.js';

type Estado = 'idle' | 'loading' | 'success' | 'error';

const CACHE_MS = 30_000;

// Store normalizado (F2): byId + allIds, estado y error tipado, caché de 30 s.
export const useAlertsStore = defineStore('alerts', () => {
  const byId = ref<Record<number, Alerta>>({});
  const allIds = ref<number[]>([]);
  const total = ref(0);
  const pagina = ref(1);
  const status = ref<Estado>('idle');
  const error = ref<Problem | null>(null);
  const accionError = ref<Problem | null>(null);
  const fetchedAt = ref<number | null>(null);
  let claveConsulta = '';

  const lista = computed<Alerta[]>(() =>
    allIds.value.map((id) => byId.value[id]).filter((a): a is Alerta => a !== undefined),
  );

  async function cargar(paginaNueva: number, force = false): Promise<void> {
    const ui = useUiStore();
    const filtros = ui.filtrosAlertas;
    const tamano = ui.tamano;
    const clave = JSON.stringify({ filtros, tamano, pagina: paginaNueva });
    const fresco = fetchedAt.value !== null && Date.now() - fetchedAt.value < CACHE_MS;
    if (!force && status.value === 'success' && clave === claveConsulta && fresco) return;

    status.value = 'loading';
    error.value = null;
    try {
      const res = await listarAlertas(filtros, paginaNueva, tamano);
      const nuevos: Record<number, Alerta> = {};
      const ids: number[] = [];
      for (const a of res.items) {
        nuevos[a.id] = a;
        ids.push(a.id);
      }
      byId.value = nuevos;
      allIds.value = ids;
      total.value = res.total;
      pagina.value = res.pagina;
      fetchedAt.value = Date.now();
      claveConsulta = clave;
      status.value = 'success';
    } catch (e) {
      error.value = extraerProblem(e);
      status.value = 'error';
    }
  }

  // Aplica la alerta devuelta por el backend (ya trae la version incrementada).
  function reemplazar(a: Alerta): void {
    byId.value = { ...byId.value, [a.id]: a };
  }

  // Acción de escritura con bloqueo optimista. Ante un 409 (u otro error) guarda
  // el Problem en accionError y recarga la página actual para refrescar versiones.
  async function ejecutarAccion(accion: () => Promise<Alerta>): Promise<boolean> {
    accionError.value = null;
    try {
      reemplazar(await accion());
      return true;
    } catch (e) {
      accionError.value = extraerProblem(e);
      await cargar(pagina.value, true);
      return false;
    }
  }

  function asignarme(id: number, usuarioId: number): Promise<boolean> {
    const actual = byId.value[id];
    if (actual === undefined) return Promise.resolve(false);
    return ejecutarAccion(() => asignarAlerta(id, usuarioId, actual.version));
  }

  function cambiarEstado(id: number, estado: EstadoAlerta): Promise<boolean> {
    const actual = byId.value[id];
    if (actual === undefined) return Promise.resolve(false);
    return ejecutarAccion(() => cambiarEstadoAlerta(id, estado, actual.version));
  }

  return { byId, allIds, total, pagina, status, error, accionError, lista, cargar, asignarme, cambiarEstado };
});
