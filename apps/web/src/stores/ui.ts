import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import type { FiltrosEventos } from '../api/events.api.js';

// Único store que se persiste (F2 de docs/06-frontend.md): filtros y tamaño de
// página. auth NUNCA se persiste. Toda lectura/escritura de localStorage va con
// try/catch porque puede fallar o venir vacía (ventana privada, datos borrados).
const CLAVE = 'siem.ui';

interface UiPersistido {
  filtrosEventos: FiltrosEventos;
  tamano: number;
}

const filtrosVacios = (): FiltrosEventos => ({
  host: '',
  usuario: '',
  src_ip: '',
  event_type: '',
  desde: '',
  hasta: '',
});

function cargarInicial(): UiPersistido {
  const base: UiPersistido = { filtrosEventos: filtrosVacios(), tamano: 50 };
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo === null) return base;
    const guardado = JSON.parse(crudo) as Partial<UiPersistido>;
    return {
      filtrosEventos: { ...filtrosVacios(), ...guardado.filtrosEventos },
      tamano: typeof guardado.tamano === 'number' ? guardado.tamano : 50,
    };
  } catch {
    return base;
  }
}

export const useUiStore = defineStore('ui', () => {
  const inicial = cargarInicial();
  const filtrosEventos = ref<FiltrosEventos>(inicial.filtrosEventos);
  const tamano = ref<number>(inicial.tamano);

  function limpiarFiltrosEventos(): void {
    filtrosEventos.value = filtrosVacios();
  }

  watch(
    [filtrosEventos, tamano],
    () => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify({ filtrosEventos: filtrosEventos.value, tamano: tamano.value }));
      } catch {
        // sin persistencia; la app sigue funcionando en memoria
      }
    },
    { deep: true },
  );

  return { filtrosEventos, tamano, limpiarFiltrosEventos };
});
