<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { TipoEventoSchema } from '@siem/shared';

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

onMounted(() => {
  void events.cargar(1);
});
</script>

<template>
  <main class="eventos">
    <h1>Eventos</h1>

    <form
      class="filtros"
      @submit.prevent="buscar"
    >
      <input
        v-model="ui.filtrosEventos.host"
        placeholder="host"
      >
      <input
        v-model="ui.filtrosEventos.usuario"
        placeholder="usuario"
      >
      <input
        v-model="ui.filtrosEventos.src_ip"
        placeholder="IP origen"
      >
      <select v-model="ui.filtrosEventos.event_type">
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
      <button type="submit">
        Buscar
      </button>
      <button
        type="button"
        @click="limpiar"
      >
        Limpiar
      </button>
    </form>

    <p
      v-if="events.status === 'loading'"
      class="aviso"
    >
      Cargando…
    </p>
    <p
      v-else-if="events.status === 'error'"
      class="aviso error"
      role="alert"
    >
      {{ events.error?.detail ?? events.error?.title ?? 'No se pudieron cargar los eventos' }}
    </p>

    <table v-else>
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
          <td>{{ fecha(e.ts) }}</td>
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
          <td
            colspan="7"
            class="vacio"
          >
            Sin eventos para estos filtros.
          </td>
        </tr>
      </tbody>
    </table>

    <footer class="paginador">
      <span>{{ events.total }} eventos · página {{ events.pagina }} de {{ totalPaginas }}</span>
      <span class="botones">
        <button
          type="button"
          :disabled="events.pagina <= 1"
          @click="irA(events.pagina - 1)"
        >
          ‹ anterior
        </button>
        <button
          type="button"
          :disabled="events.pagina >= totalPaginas"
          @click="irA(events.pagina + 1)"
        >
          siguiente ›
        </button>
      </span>
    </footer>
  </main>
</template>

<style scoped>
.eventos {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
  color: #1f2933;
}
h1 {
  font-size: 1.25rem;
}
.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: end;
  margin-bottom: 1rem;
}
.filtros input,
.filtros select {
  padding: 0.4rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
}
.filtros label {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  color: #52606d;
  gap: 0.2rem;
}
.filtros button {
  padding: 0.45rem 0.8rem;
  border: 1px solid #2b6cb0;
  border-radius: 6px;
  background: #2b6cb0;
  color: #fff;
  cursor: pointer;
}
.filtros button[type='button'] {
  background: #fff;
  color: #2b6cb0;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
th,
td {
  border-bottom: 1px solid #e4e7eb;
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
}
th {
  color: #52606d;
  font-weight: 600;
}
.raw {
  font-family: Consolas, monospace;
  font-size: 0.78rem;
  color: #52606d;
  max-width: 360px;
  overflow-wrap: anywhere;
}
.vacio,
.aviso {
  color: #718096;
  padding: 1rem 0;
}
.aviso.error {
  color: #c53030;
}
.paginador {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #52606d;
}
.botones button {
  padding: 0.35rem 0.7rem;
  margin-left: 0.4rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
.botones button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
