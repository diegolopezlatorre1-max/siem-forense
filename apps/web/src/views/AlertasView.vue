<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { type Alerta, type EstadoAlerta, EstadoAlertaSchema, SeveridadSchema } from '@siem/shared';

import AvisoError from '../components/AvisoError.vue';
import ChipEstado from '../components/ChipEstado.vue';
import ChipSeveridad from '../components/ChipSeveridad.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import IndicadorCarga from '../components/IndicadorCarga.vue';
import { ETIQUETA_ESTADO, ETIQUETA_SEVERIDAD } from '../components/etiquetas.js';
import type { GrupoAlertas } from '../stores/agrupar-alertas.js';
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

// Solo el admin puede borrar todas las alertas (limpiar el tablero antes de una demo).
const puedeBorrar = computed(() => auth.rol === 'admin');

async function borrarTodas(): Promise<void> {
  if (!window.confirm('¿Borrar TODAS las alertas? Esta acción no se puede deshacer.')) return;
  await alerts.borrarTodas();
}

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

// Grupos desplegados, por id de grupo (estable): sobreviven al auto-refresco.
const desplegados = ref<Set<string>>(new Set());

function alternar(g: GrupoAlertas): void {
  const nuevo = new Set(desplegados.value);
  if (nuevo.has(g.id)) nuevo.delete(g.id);
  else nuevo.add(g.id);
  desplegados.value = nuevo;
}

function idPanel(g: GrupoAlertas): string {
  return `ataque-${g.id.replace(/[^\w-]/g, '_')}`;
}

function grupoTieneAjenas(g: GrupoAlertas): boolean {
  return g.alertas.some((a) => !esMia(a));
}

function puedeModificarGrupo(g: GrupoAlertas): boolean {
  return g.alertas.every(puedeModificar);
}

function asignarmeGrupo(g: GrupoAlertas): void {
  if (auth.usuario !== null) void alerts.asignarmeVarias(g.alertas.map((a) => a.id), auth.usuario.id);
}

function cambiarEstadoGrupo(g: GrupoAlertas, destino: string): void {
  if (destino === '') return;
  void alerts.cambiarEstadoVarias(
    g.alertas.map((a) => a.id),
    destino as EstadoAlerta,
  );
}

function rango(g: GrupoAlertas): string {
  return g.desde === g.hasta ? fecha(g.hasta) : `${fecha(g.desde)} – ${fecha(g.hasta)}`;
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

// Auto-refresco: recarga la página actual cada 4 s para que las alertas
// nuevas aparezcan solas durante una demo, sin pulsar "Buscar".
let temporizador: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  void alerts.cargar(1);
  temporizador = setInterval(() => {
    void alerts.cargar(alerts.pagina, true);
  }, 4000);
});

onUnmounted(() => {
  if (temporizador !== undefined) clearInterval(temporizador);
});
</script>

<template>
  <main class="pagina">
    <header class="cabecera-pagina">
      <h1>Alertas</h1>
      <p>
        {{ alerts.grupos.length }} {{ alerts.grupos.length === 1 ? 'ataque' : 'ataques' }}
        · {{ alerts.total }} alertas
      </p>
      <button
        v-if="puedeBorrar"
        type="button"
        class="borrar-todas"
        @click="borrarTodas"
      >
        Borrar alertas
      </button>
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
        v-if="alerts.grupos.length > 0"
        class="lista"
      >
        <li
          v-for="g in alerts.grupos"
          :key="g.id"
          class="grupo"
          :class="`sev-${g.severidad}`"
        >
          <div class="grupo-cabecera">
            <ChipSeveridad :severidad="g.severidad" />
            <div class="cuerpo">
              <p class="titulo">
                Ataque desde {{ g.clave }}
              </p>
              <p class="reglas">
                <span
                  v-for="r in g.reglas"
                  :key="r"
                  class="regla"
                >{{ r }}</span>
              </p>
              <p class="meta">
                {{ g.alertas.length }} {{ g.alertas.length === 1 ? 'alerta' : 'alertas' }}
                · cantidad {{ g.cantidadTotal }}
              </p>
              <p class="pie">
                {{ rango(g) }}
              </p>
              <div class="acciones">
                <ChipEstado
                  v-if="g.estado !== null"
                  :estado="g.estado"
                />
                <span
                  v-else
                  class="chip"
                >Mixto</span>
                <button
                  v-if="puedeAsignarse && grupoTieneAjenas(g)"
                  type="button"
                  class="accion"
                  @click="asignarmeGrupo(g)"
                >
                  Asignarme el ataque
                </button>
                <label
                  v-if="puedeModificarGrupo(g)"
                  class="cambiar-estado"
                >
                  estado del ataque:
                  <select
                    :value="g.estado ?? ''"
                    @change="cambiarEstadoGrupo(g, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-if="g.estado === null"
                      value=""
                      disabled
                    >
                      Mixto
                    </option>
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
            <button
              type="button"
              class="desplegar"
              :aria-expanded="desplegados.has(g.id)"
              :aria-controls="idPanel(g)"
              @click="alternar(g)"
            >
              {{ desplegados.has(g.id) ? '▾ Ocultar alertas' : `▸ Ver alertas (${g.alertas.length})` }}
            </button>
          </div>

          <ul
            v-if="desplegados.has(g.id)"
            :id="idPanel(g)"
            class="lista alertas-grupo"
          >
            <li
              v-for="a in g.alertas"
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
.grupo {
  border: 1px solid var(--color-borde);
  border-left: 6px solid var(--color-neutro);
  border-radius: var(--radio-m);
  padding: var(--esp-3) var(--esp-4);
  background: var(--color-superficie);
  box-shadow: var(--sombra-1);
}
.grupo.sev-critical {
  border-left-color: var(--color-sev-critical);
}
.grupo.sev-high {
  border-left-color: var(--color-sev-high);
}
.grupo.sev-medium {
  border-left-color: var(--color-sev-medium);
}
.grupo.sev-low {
  border-left-color: var(--color-sev-low);
}
.grupo-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--esp-3);
}
.reglas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1);
  margin: 0.3rem 0 0;
}
.regla {
  font-family: var(--fuente-mono);
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-m);
  color: var(--color-texto-2);
}
.desplegar {
  margin-left: auto;
  padding: var(--esp-1) 0.6rem;
  font-size: 0.8rem;
  white-space: nowrap;
}
.alertas-grupo {
  margin-top: var(--esp-3);
}
.alertas-grupo .tarjeta {
  box-shadow: none;
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
.borrar-todas {
  margin-left: auto;
  color: var(--color-sev-critical, #b91c1c);
  border-color: var(--color-sev-critical, #b91c1c);
}
</style>
