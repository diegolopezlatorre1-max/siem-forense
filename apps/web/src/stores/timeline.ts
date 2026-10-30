import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ElementoLineaTiempo, Problem } from '@siem/shared';

import { consultarLineaTiempo, type FiltrosLineaTiempo } from '../api/timeline.api.js';
import { extraerProblem } from '../api/http.js';

type Estado = 'idle' | 'loading' | 'success' | 'error';

// Valor para <input type="datetime-local">: fecha y hora locales sin zona ni segundos.
export function aLocal(fecha: Date): string {
  const dos = (n: number): string => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

// Por defecto, las últimas 24 horas.
const filtrosIniciales = (ahora = new Date()): FiltrosLineaTiempo => ({
  host: '',
  usuario: '',
  src_ip: '',
  desde: aLocal(new Date(ahora.getTime() - 24 * 3600_000)),
  hasta: aLocal(ahora),
});

// La línea de tiempo es una consulta puntual (no se pagina ni se cachea): guarda la última respuesta.
export const useTimelineStore = defineStore('timeline', () => {
  const filtros = ref<FiltrosLineaTiempo>(filtrosIniciales());
  const items = ref<ElementoLineaTiempo[]>([]);
  const truncada = ref(false);
  const status = ref<Estado>('idle');
  const error = ref<Problem | null>(null);

  const tieneSujeto = computed(() =>
    [filtros.value.host, filtros.value.usuario, filtros.value.src_ip].some((v) => v.trim() !== ''),
  );
  const totalAlertas = computed(() => items.value.filter((i) => i.tipo === 'alerta').length);

  async function cargar(): Promise<void> {
    if (!tieneSujeto.value) return;
    status.value = 'loading';
    error.value = null;
    try {
      const res = await consultarLineaTiempo(filtros.value);
      items.value = res.items;
      truncada.value = res.truncada;
      status.value = 'success';
    } catch (e) {
      error.value = extraerProblem(e);
      status.value = 'error';
    }
  }

  function limpiar(): void {
    filtros.value = filtrosIniciales();
    items.value = [];
    truncada.value = false;
    status.value = 'idle';
    error.value = null;
  }

  return { filtros, items, truncada, status, error, tieneSujeto, totalAlertas, cargar, limpiar };
});
