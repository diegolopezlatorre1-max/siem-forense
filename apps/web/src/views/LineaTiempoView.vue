<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

import AvisoError from '../components/AvisoError.vue';
import ChipEstado from '../components/ChipEstado.vue';
import ChipSeveridad from '../components/ChipSeveridad.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import IndicadorCarga from '../components/IndicadorCarga.vue';
import { useTimelineStore } from '../stores/timeline.js';

const timeline = useTimelineStore();
const route = useRoute();

function buscar(): void {
  void timeline.cargar();
}

type Item = (typeof timeline.items)[number];

function claveDe(i: Item): string {
  return `${i.tipo}-${i.tipo === 'evento' ? i.evento.id : i.alerta.id}`;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

function dia(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Separador de día antes del primer elemento y cada vez que cambia la fecha local.
function cambiaDia(n: number): boolean {
  const actual = timeline.items[n];
  const anterior = timeline.items[n - 1];
  if (actual === undefined) return false;
  return anterior === undefined || new Date(anterior.ts).toDateString() !== new Date(actual.ts).toDateString();
}

// Permite enlazar desde otras vistas: /linea-tiempo?src_ip=192.168.56.103
onMounted(() => {
  let desdeEnlace = false;
  for (const clave of ['host', 'usuario', 'src_ip'] as const) {
    const valor = route.query[clave];
    if (typeof valor === 'string' && valor !== '') {
      timeline.filtros[clave] = valor;
      desdeEnlace = true;
    }
  }
  if (desdeEnlace) void timeline.cargar();
});
</script>

<template>
  <main class="pagina">
    <header class="cabecera-pagina">
      <h1>Línea de tiempo</h1>
      <p
        v-if="timeline.status === 'success'"
        class="resumen"
      >
        {{ timeline.items.length }} elementos · {{ timeline.totalAlertas }} alertas
        <span
          v-if="timeline.truncada"
          class="truncada"
        >· hay más resultados: se muestran los más recientes, acote el rango</span>
      </p>
    </header>

    <form
      class="filtros panel"
      @submit.prevent="buscar"
    >
      <input
        v-model="timeline.filtros.host"
        placeholder="host"
        aria-label="Host"
      >
      <input
        v-model="timeline.filtros.usuario"
        placeholder="usuario"
        aria-label="Usuario"
      >
      <input
        v-model="timeline.filtros.src_ip"
        placeholder="IP origen"
        aria-label="IP origen"
      >
      <label>
        desde
        <input
          v-model="timeline.filtros.desde"
          type="datetime-local"
          required
        >
      </label>
      <label>
        hasta
        <input
          v-model="timeline.filtros.hasta"
          type="datetime-local"
          required
        >
      </label>
      <button
        type="submit"
        class="primario"
        :disabled="!timeline.tieneSujeto"
      >
        Consultar
      </button>
      <button
        type="button"
        @click="timeline.limpiar()"
      >
        Limpiar
      </button>
    </form>

    <p
      v-if="!timeline.tieneSujeto"
      class="aviso"
    >
      Indique un host, un usuario o una IP para ver su línea de tiempo.
    </p>
    <IndicadorCarga v-else-if="timeline.status === 'loading'" />
    <AvisoError
      v-else-if="timeline.status === 'error'"
      :problema="timeline.error"
      por-defecto="No se pudo cargar la línea de tiempo"
    />

    <template v-else-if="timeline.status === 'success'">
      <ol
        v-if="timeline.items.length > 0"
        class="cronologia"
      >
        <template
          v-for="(i, n) in timeline.items"
          :key="claveDe(i)"
        >
          <li
            v-if="cambiaDia(n)"
            class="dia"
          >
            {{ dia(i.ts) }}
          </li>
          <li
            class="elemento"
            :class="i.tipo === 'alerta' ? `alerta sev-${i.alerta.severidad}` : `evento tipo-${i.evento.event_type}`"
          >
            <time
              class="hora"
              :datetime="i.ts"
            >{{ hora(i.ts) }}</time>
            <div
              v-if="i.tipo === 'evento'"
              class="detalle"
            >
              <p class="titulo">
                {{ i.evento.event_type }}
                <span class="meta">· {{ i.evento.host }} · {{ i.evento.usuario ?? '—' }} · {{ i.evento.src_ip ?? '—' }} · {{ i.evento.source }}</span>
              </p>
              <p class="raw">
                {{ i.evento.raw }}
              </p>
            </div>
            <div
              v-else
              class="detalle"
            >
              <p class="titulo">
                <ChipSeveridad :severidad="i.alerta.severidad" />
                {{ i.alerta.regla_id }} · {{ i.alerta.nombre }}
              </p>
              <p class="meta">
                {{ i.alerta.clave }} · cantidad {{ i.alerta.cantidad }} · MITRE {{ i.alerta.mitre }}
                <ChipEstado :estado="i.alerta.estado" />
              </p>
            </div>
          </li>
        </template>
      </ol>
      <EstadoVacio
        v-else
        class="panel"
      >
        Sin eventos ni alertas en ese rango.
      </EstadoVacio>
    </template>
  </main>
</template>

<style scoped>
.truncada {
  color: var(--color-aviso-texto);
}
.cronologia {
  list-style: none;
  margin: 0;
  padding: 0 0 0 var(--esp-3);
  border-left: 2px solid var(--color-borde);
}
.elemento {
  position: relative;
  display: flex;
  gap: var(--esp-4);
  padding: var(--esp-2) 0 var(--esp-2) var(--esp-4);
  font-size: var(--texto-s);
}
.elemento::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--esp-3));
  top: 0.85rem;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 50%;
  background: var(--color-neutro);
}
.elemento.tipo-login_success::before {
  background: var(--color-ok);
}
.elemento.tipo-user_created::before {
  background: var(--color-aviso);
}
.elemento.alerta {
  border: 1px solid var(--color-borde);
  border-left: 4px solid var(--color-sev-high);
  border-radius: var(--radio-s);
  margin: 0.4rem 0;
  background: var(--color-peligro-suave);
}
.elemento.alerta::before {
  background: var(--color-sev-high);
  width: 14px;
  height: 14px;
  margin-left: -7px;
}
.elemento.alerta.sev-critical {
  border-left-color: var(--color-sev-critical);
}
.elemento.alerta.sev-critical::before {
  background: var(--color-sev-critical);
}
.elemento.alerta.sev-medium {
  border-left-color: var(--color-sev-medium);
  background: var(--color-aviso-suave);
}
.elemento.alerta.sev-medium::before {
  background: var(--color-sev-medium);
}
.elemento.alerta.sev-low {
  border-left-color: var(--color-sev-low);
  background: var(--color-primario-suave);
}
.elemento.alerta.sev-low::before {
  background: var(--color-sev-low);
}
.dia {
  position: relative;
  margin: var(--esp-4) 0 var(--esp-1);
  padding-left: var(--esp-4);
  color: var(--color-texto-2);
  font-size: var(--texto-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dia:first-child {
  margin-top: 0;
}
.dia::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--esp-3) - 6px);
  top: 0.2rem;
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-texto-3);
  border-radius: 2px;
  background: var(--color-fondo);
}
.hora {
  flex: 0 0 6.5rem;
  color: var(--color-texto-2);
  font-family: var(--fuente-mono);
  font-size: 0.78rem;
}
.detalle p {
  margin: 0;
}
.titulo {
  font-weight: 600;
}
.meta {
  font-weight: 400;
  color: var(--color-texto-2);
}
.raw {
  font-family: var(--fuente-mono);
  font-size: var(--texto-xs);
  color: var(--color-texto-3);
  overflow-wrap: anywhere;
}
.titulo .chip {
  margin-right: 0.3rem;
}
@media (max-width: 640px) {
  .elemento {
    flex-direction: column;
    gap: 0.2rem;
  }
  .hora {
    flex-basis: auto;
  }
}
</style>
