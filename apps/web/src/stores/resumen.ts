import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { type Problem, type Severidad, SeveridadSchema } from '@siem/shared';

import { listarAlertas } from '../api/alerts.api.js';
import { extraerProblem } from '../api/http.js';

type Estado = 'idle' | 'loading' | 'success' | 'error';

const CACHE_MS = 30_000;

const ceros = (): Record<Severidad, number> => ({ low: 0, medium: 0, high: 0, critical: 0 });

// Resumen de Inicio: alertas abiertas por severidad y alertas en progreso. No hay endpoint de
// conteos, así que se pide una página de tamaño 1 por filtro y se lee el `total`.
export const useResumenStore = defineStore('resumen', () => {
  const abiertas = ref<Record<Severidad, number>>(ceros());
  const enProgreso = ref(0);
  const status = ref<Estado>('idle');
  const error = ref<Problem | null>(null);
  const fetchedAt = ref<number | null>(null);

  const totalAbiertas = computed(() => Object.values(abiertas.value).reduce((a, b) => a + b, 0));

  async function cargar(force = false): Promise<void> {
    const fresco = fetchedAt.value !== null && Date.now() - fetchedAt.value < CACHE_MS;
    if (!force && status.value === 'success' && fresco) return;

    status.value = 'loading';
    error.value = null;
    try {
      const severidades = SeveridadSchema.options;
      const [progreso, ...porSeveridad] = await Promise.all([
        listarAlertas({ estado: 'en_progreso', severidad: '', regla_id: '' }, 1, 1),
        ...severidades.map((s) => listarAlertas({ estado: 'abierta', severidad: s, regla_id: '' }, 1, 1)),
      ]);
      const conteo = ceros();
      severidades.forEach((s, i) => {
        conteo[s] = porSeveridad[i]?.total ?? 0;
      });
      abiertas.value = conteo;
      enProgreso.value = progreso.total;
      fetchedAt.value = Date.now();
      status.value = 'success';
    } catch (e) {
      error.value = extraerProblem(e);
      status.value = 'error';
    }
  }

  return { abiertas, enProgreso, totalAbiertas, status, error, cargar };
});
