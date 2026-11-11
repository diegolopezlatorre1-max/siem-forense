<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { TipoEventoSchema } from '@siem/shared';

import AvisoError from '../components/AvisoError.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import IndicadorCarga from '../components/IndicadorCarga.vue';
import { useEventsStore } from '../stores/events.js';
import { useUiStore } from '../stores/ui.js';

const ui = useUiStore();
const events = useEventsStore();

const tiposEvento = TipoEventoSchema.options;

const totalPaginas = computed(() => Math.max(1, Math.ceil(events.total / ui.tamano)));

function buscar(): void {
  void events.cargar(1, true);
}

function limpiar(): void {
  ui.limpiarFiltrosEventos();
  void events.cargar(1, true);
}

function irA(paginaNueva: number): void {
  if (paginaNueva < 1 || paginaNueva > totalPaginas.value) return;
  void events.cargar(paginaNueva, true);
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString();
}

// Auto-refresco: recarga la página actual cada 4 s para que los eventos
// nuevos aparezcan solos durante una demo, sin pulsar "Buscar".
let temporizador: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  void events.cargar(1);
  temporizador = setInterval(() => {
    void events.cargar(events.pagina, true);
  }, 4000);
});

onUnmounted(() => {
  if (temporizador !== undefined) clearInterval(temporizador);
});
</script>

<template>
  <main class="pagina">
    <header class="cabecera-pagina">
      <h1>Eventos</h1>
      <p>{{ events.total }} eventos</p>
    </header>

    <form
      class="filtros panel"
      @submit.prevent="buscar"
    >
      <input
        v-model="ui.filtrosEventos.host"
        placeholder="host"
        aria-label="Host"
      >
      <input
        v-model="ui.filtrosEventos.usuario"
        placeholder="usuario"
        aria-label="Usuario"
      >
      <input
        v-model="ui.filtrosEventos.src_ip"
        placeholder="IP origen"
        aria-label="IP origen"
      >
      <select
        v-model="ui.filtrosEventos.event_type"
        aria-label="Tipo de evento"
      >
        <option value="">
          todos los tipos
        </option>
        <option
          v-for="t in tiposEvento"
          :key="t"
          :value="t"
        >
          {{ t }}
        </option>
      </select>
      <label>
        desde
        <input
          v-model="ui.filtrosEventos.desde"
          type="datetime-local"
        >
      </label>
      <label>
        hasta
        <input
          v-model="ui.filtrosEventos.hasta"
          type="datetime-local"
        >
      </label>
      <button
        type="submit"
        class="primario"
      >
        Buscar
      </button>
      <button
        type="button"
        @click="limpiar"
      >
        Limpiar
      </button>
    </form>

    <IndicadorCarga v-if="events.status === 'loading'" />
    <AvisoError
      v-else-if="events.status === 'error'"
      :problema="events.error"
      por-defecto="No se pudieron cargar los eventos"
    />

    <div
      v-else
      class="panel tabla-contenedor"
      tabindex="0"
      role="region"
      aria-label="Tabla de eventos"
    >
      <table>
        <thead>
          <tr>
            <th>ts</th>
            <th>host</th>
            <th>tipo</th>
            <th>usuario</th>
            <th>IP origen</th>
            <th>sev.</th>
            <th>raw</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in events.lista"
            :key="e.id"
          >
            <td class="ts">
              {{ fecha(e.ts) }}
            </td>
            <td>{{ e.host }}</td>
            <td>{{ e.event_type }}</td>
            <td>{{ e.usuario ?? '—' }}</td>
            <td>{{ e.src_ip ?? '—' }}</td>
            <td>{{ e.severity }}</td>
            <td class="raw">
              {{ e.raw }}
            </td>
          </tr>
          <tr v-if="events.lista.length === 0">
            <td colspan="7">
              <EstadoVacio>Sin eventos para estos filtros.</EstadoVacio>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="paginador">
      <span>Página {{ events.pagina }} de {{ totalPaginas }}</span>
      <span class="botones">
        <button
          type="button"
          :disabled="events.pagina <= 1"
          @click="irA(events.pagina - 1)"
        >
          ‹ Anterior
        </button>
        <button
          type="button"
          :disabled="events.pagina >= totalPaginas"
          @click="irA(events.pagina + 1)"
        >
          Siguiente ›
        </button>
      </span>
    </footer>
  </main>
</template>

<style scoped>
.ts {
  white-space: nowrap;
}
.raw {
  font-family: var(--fuente-mono);
  font-size: 0.78rem;
  color: var(--color-texto-2);
  min-width: 240px;
  max-width: 520px;
  overflow-wrap: anywhere;
}
</style>
