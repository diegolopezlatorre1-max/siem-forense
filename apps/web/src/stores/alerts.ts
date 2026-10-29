import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Alerta, Problem } from '@siem/shared';

import { listarAlertas } from '../api/alerts.api.js';
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

  return { byId, allIds, total, pagina, status, error, lista, cargar };
});
