import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Evento, Problem } from '@siem/shared';

import { listarEventos } from '../api/events.api.js';
import { extraerProblem } from '../api/http.js';
import { useUiStore } from './ui.js';

type Estado = 'idle' | 'loading' | 'success' | 'error';

const CACHE_MS = 30_000; // no se vuelve a pedir la misma consulta antes de 30 s, salvo force

// Store normalizado (F2 de docs/06-frontend.md): byId + allIds, estado y error tipado.
export const useEventsStore = defineStore('events', () => {
  const byId = ref<Record<number, Evento>>({});
  const allIds = ref<number[]>([]);
  const total = ref(0);
  const pagina = ref(1);
  const status = ref<Estado>('idle');
  const error = ref<Problem | null>(null);
  const fetchedAt = ref<number | null>(null);
  let claveConsulta = '';

  const lista = computed<Evento[]>(() =>
    allIds.value.map((id) => byId.value[id]).filter((e): e is Evento => e !== undefined),
  );

  async function cargar(paginaNueva: number, force = false): Promise<void> {
    const ui = useUiStore();
    const filtros = ui.filtrosEventos;
    const tamano = ui.tamano;
    const clave = JSON.stringify({ filtros, tamano, pagina: paginaNueva });
    const fresco = fetchedAt.value !== null && Date.now() - fetchedAt.value < CACHE_MS;
    if (!force && status.value === 'success' && clave === claveConsulta && fresco) return;

    status.value = 'loading';
    error.value = null;
    try {
      const res = await listarEventos(filtros, paginaNueva, tamano);
      const nuevos: Record<number, Evento> = {};
      const ids: number[] = [];
      for (const e of res.items) {
        nuevos[e.id] = e;
        ids.push(e.id);
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
