<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { type Alerta, type EstadoAlerta, EstadoAlertaSchema, SeveridadSchema } from '@siem/shared';

import { useAlertsStore } from '../stores/alerts.js';
import { useAuthStore } from '../stores/auth.js';
import { useUiStore } from '../stores/ui.js';

const ui = useUiStore();
const alerts = useAlertsStore();
const auth = useAuthStore();

const severidades = SeveridadSchema.options;
const estados = EstadoAlertaSchema.options;

const totalPaginas = computed(() => Math.max(1, Math.ceil(alerts.total / ui.tamano)));

// ABAC, reflejo del backend (alerta.policy.ts): el analista solo se asigna a sí
// mismo y solo modifica las alertas que tiene asignadas; el admin, cualquiera.
const puedeAsignarse = computed(() => auth.rol === 'admin' || auth.rol === 'analista');

function puedeModificar(a: Alerta): boolean {
  return auth.rol === 'admin' || (auth.rol === 'analista' && a.asignada_a === auth.usuario?.id);
}

function esMia(a: Alerta): boolean {
  return a.asignada_a !== null && a.asignada_a === auth.usuario?.id;
}

function asignarme(a: Alerta): void {
  if (auth.usuario !== null) void alerts.asignarme(a.id, auth.usuario.id);
}

function cambiarEstado(a: Alerta, destino: EstadoAlerta): void {
  if (destino !== a.estado) void alerts.cambiarEstado(a.id, destino);
}

function buscar(): void {
  void alerts.cargar(1, true);
}

function limpiar(): void {
  ui.limpiarFiltrosAlertas();
  void alerts.cargar(1, true);
}

function irA(paginaNueva: number): void {
  if (paginaNueva < 1 || paginaNueva > totalPaginas.value) return;
  void alerts.cargar(paginaNueva, true);
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString();
}

onMounted(() => {
  void alerts.cargar(1);
});
</script>

<template>
  <main class="alertas">
    <h1>Alertas</h1>

    <form
      class="filtros"
      @submit.prevent="buscar"
    >
      <select v-model="ui.filtrosAlertas.estado">
        <option value="">
          todo estado
        </option>
        <option
          v-for="e in estados"
          :key="e"
          :value="e"
        >
          {{ e }}
        </option>
      </select>
      <select v-model="ui.filtrosAlertas.severidad">
        <option value="">
          toda severidad
        </option>
        <option
          v-for="s in severidades"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select>
      <input
        v-model="ui.filtrosAlertas.regla_id"
        placeholder="regla (p. ej. LINUX-001)"
      >
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
      v-if="alerts.accionError"
      class="aviso error"
      role="alert"
    >
      {{ alerts.accionError.detail ?? alerts.accionError.title }}
    </p>

    <p
      v-if="alerts.status === 'loading'"
      class="aviso"
    >
      Cargando…
    </p>
    <p
      v-else-if="alerts.status === 'error'"
      class="aviso error"
      role="alert"
    >
      {{ alerts.error?.detail ?? alerts.error?.title ?? 'No se pudieron cargar las alertas' }}
    </p>

    <ul
      v-else
      class="lista"
    >
      <li
        v-for="a in alerts.lista"
        :key="a.id"
        class="tarjeta"
        :class="`sev-${a.severidad}`"
      >
        <span
          class="chip"
          :class="`sev-${a.severidad}`"
        >{{ a.severidad.toUpperCase() }}</span>
        <div class="cuerpo">
          <p class="titulo">
            {{ a.regla_id }} · {{ a.nombre }}
          </p>
          <p class="meta">
            {{ a.clave }} · cantidad {{ a.cantidad }}
          </p>
          <p class="pie">
            MITRE {{ a.mitre }} · {{ fecha(a.ts) }}
          </p>
          <div class="acciones">
            <span
              class="estado"
              :class="`est-${a.estado}`"
            >{{ a.estado }}</span>
            <span class="asignada">
              {{ a.asignada_a === null ? 'sin asignar' : esMia(a) ? 'asignada a ti' : `asignada a #${a.asignada_a}` }}
            </span>
            <button
              v-if="puedeAsignarse && !esMia(a)"
              type="button"
              class="accion"
              @click="asignarme(a)"
            >
              Asignármela
            </button>
            <label
              v-if="puedeModificar(a)"
              class="cambiar-estado"
            >
              estado:
              <select
                :value="a.estado"
                @change="cambiarEstado(a, ($event.target as HTMLSelectElement).value as EstadoAlerta)"
              >
                <option
                  v-for="e in estados"
                  :key="e"
                  :value="e"
                >
                  {{ e }}
                </option>
              </select>
            </label>
          </div>
        </div>
      </li>
      <li
        v-if="alerts.lista.length === 0"
        class="vacio"
      >
        Sin alertas para estos filtros.
      </li>
    </ul>

    <footer class="paginador">
      <span>{{ alerts.total }} alertas · página {{ alerts.pagina }} de {{ totalPaginas }}</span>
      <span class="botones">
        <button
          type="button"
          :disabled="alerts.pagina <= 1"
          @click="irA(alerts.pagina - 1)"
        >
          ‹ anterior
        </button>
        <button
          type="button"
          :disabled="alerts.pagina >= totalPaginas"
          @click="irA(alerts.pagina + 1)"
        >
          siguiente ›
        </button>
      </span>
    </footer>
  </main>
</template>

<style scoped>
.alertas {
  max-width: 900px;
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
  margin-bottom: 1rem;
}
.filtros input,
.filtros select {
  padding: 0.4rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
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
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.tarjeta {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid #e4e7eb;
  border-left: 6px solid #9aa5b1;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: #fff;
}
.tarjeta.sev-high,
.tarjeta.sev-critical {
  border-left-color: #c53030;
}
.tarjeta.sev-medium {
  border-left-color: #b7791f;
}
.tarjeta.sev-low {
  border-left-color: #2b6cb0;
}
.chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 11px;
  white-space: nowrap;
}
.chip.sev-high,
.chip.sev-critical {
  background: #fbeaea;
  color: #9b2c2c;
}
.chip.sev-medium {
  background: #fbf3e2;
  color: #975a16;
}
.chip.sev-low {
  background: #ebf2fa;
  color: #2b6cb0;
}
.titulo {
  margin: 0;
  font-weight: 700;
}
.meta {
  margin: 0.2rem 0 0;
  color: #52606d;
  font-size: 0.85rem;
}
.pie {
  margin: 0.2rem 0 0;
  color: #718096;
  font-size: 0.78rem;
  font-family: Consolas, monospace;
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #52606d;
}
.estado {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  background: #edf0f3;
  color: #3e4c59;
}
.estado.est-abierta {
  background: #ebf2fa;
  color: #2b6cb0;
}
.estado.est-en_progreso {
  background: #fbf3e2;
  color: #975a16;
}
.estado.est-cerrada {
  background: #e6f6ec;
  color: #276749;
}
.estado.est-falso_positivo {
  background: #edf0f3;
  color: #616e7c;
}
.asignada {
  font-style: italic;
}
.accion {
  padding: 0.25rem 0.6rem;
  border: 1px solid #2b6cb0;
  border-radius: 6px;
  background: #fff;
  color: #2b6cb0;
  cursor: pointer;
}
.cambiar-estado select {
  margin-left: 0.3rem;
  padding: 0.2rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
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
