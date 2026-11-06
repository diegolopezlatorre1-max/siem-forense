<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { type Alerta, type EstadoAlerta, EstadoAlertaSchema, SeveridadSchema } from '@siem/shared';

import AvisoError from '../components/AvisoError.vue';
import ChipEstado from '../components/ChipEstado.vue';
import ChipSeveridad from '../components/ChipSeveridad.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import IndicadorCarga from '../components/IndicadorCarga.vue';
import { ETIQUETA_ESTADO, ETIQUETA_SEVERIDAD } from '../components/etiquetas.js';
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
  <main class="pagina">
    <header class="cabecera-pagina">
      <h1>Alertas</h1>
      <p>{{ alerts.total }} alertas</p>
    </header>

    <form
      class="filtros panel"
      @submit.prevent="buscar"
    >
      <select
        v-model="ui.filtrosAlertas.estado"
        aria-label="Estado"
      >
        <option value="">
          Todo estado
        </option>
        <option
          v-for="e in estados"
          :key="e"
          :value="e"
        >
          {{ ETIQUETA_ESTADO[e] }}
        </option>
      </select>
      <select
        v-model="ui.filtrosAlertas.severidad"
        aria-label="Severidad"
      >
        <option value="">
          Toda severidad
        </option>
        <option
          v-for="s in severidades"
          :key="s"
          :value="s"
        >
          {{ ETIQUETA_SEVERIDAD[s] }}
        </option>
      </select>
      <input
        v-model="ui.filtrosAlertas.regla_id"
        placeholder="regla (p. ej. LINUX-001)"
        aria-label="Regla"
      >
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

    <AvisoError
      v-if="alerts.accionError"
      :problema="alerts.accionError"
    />

    <IndicadorCarga v-if="alerts.status === 'loading'" />
    <AvisoError
      v-else-if="alerts.status === 'error'"
      :problema="alerts.error"
      por-defecto="No se pudieron cargar las alertas"
    />

    <template v-else>
      <ul
        v-if="alerts.lista.length > 0"
        class="lista"
      >
        <li
          v-for="a in alerts.lista"
          :key="a.id"
          class="tarjeta"
          :class="`sev-${a.severidad}`"
        >
          <ChipSeveridad :severidad="a.severidad" />
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
              <ChipEstado :estado="a.estado" />
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
                    {{ ETIQUETA_ESTADO[e] }}
                  </option>
                </select>
              </label>
            </div>
          </div>
        </li>
      </ul>
      <EstadoVacio
        v-else
        class="panel"
      >
        Sin alertas para estos filtros.
      </EstadoVacio>
    </template>

    <footer class="paginador">
      <span>Página {{ alerts.pagina }} de {{ totalPaginas }}</span>
      <span class="botones">
        <button
          type="button"
          :disabled="alerts.pagina <= 1"
          @click="irA(alerts.pagina - 1)"
        >
          ‹ Anterior
        </button>
        <button
          type="button"
          :disabled="alerts.pagina >= totalPaginas"
          @click="irA(alerts.pagina + 1)"
        >
          Siguiente ›
        </button>
      </span>
    </footer>
  </main>
</template>

<style scoped>
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
  gap: var(--esp-3);
  border: 1px solid var(--color-borde);
  border-left: 6px solid var(--color-neutro);
  border-radius: var(--radio-m);
  padding: var(--esp-3) var(--esp-4);
  background: var(--color-superficie);
  box-shadow: var(--sombra-1);
}
.tarjeta.sev-critical {
  border-left-color: var(--color-sev-critical);
}
.tarjeta.sev-high {
  border-left-color: var(--color-sev-high);
}
.tarjeta.sev-medium {
  border-left-color: var(--color-sev-medium);
}
.tarjeta.sev-low {
  border-left-color: var(--color-sev-low);
}
.cuerpo {
  flex: 1;
  min-width: 0;
}
.titulo {
  margin: 0;
  font-weight: 700;
}
.meta {
  margin: 0.2rem 0 0;
  color: var(--color-texto-2);
  font-size: var(--texto-s);
  overflow-wrap: anywhere;
}
.pie {
  margin: 0.2rem 0 0;
  color: var(--color-texto-3);
  font-size: 0.78rem;
  font-family: var(--fuente-mono);
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2);
  margin-top: var(--esp-2);
  font-size: 0.8rem;
  color: var(--color-texto-2);
}
.asignada {
  font-style: italic;
}
.accion {
  padding: var(--esp-1) 0.6rem;
}
.cambiar-estado select {
  margin-left: 0.3rem;
  padding: 0.2rem;
}
</style>
