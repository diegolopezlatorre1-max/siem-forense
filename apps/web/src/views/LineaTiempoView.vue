<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

import { useTimelineStore } from '../stores/timeline.js';

const timeline = useTimelineStore();
const route = useRoute();

function buscar(): void {
  void timeline.cargar();
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString();
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
  <main class="linea">
    <h1>Línea de tiempo</h1>

    <form
      class="filtros"
      @submit.prevent="buscar"
    >
      <input
        v-model="timeline.filtros.host"
        placeholder="host"
      >
      <input
        v-model="timeline.filtros.usuario"
        placeholder="usuario"
      >
      <input
        v-model="timeline.filtros.src_ip"
        placeholder="IP origen"
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
    <p
      v-else-if="timeline.status === 'loading'"
      class="aviso"
    >
      Cargando…
    </p>
    <p
      v-else-if="timeline.status === 'error'"
      class="aviso error"
      role="alert"
    >
      {{ timeline.error?.detail ?? timeline.error?.title ?? 'No se pudo cargar la línea de tiempo' }}
    </p>

    <template v-else-if="timeline.status === 'success'">
      <p class="resumen">
        {{ timeline.items.length }} elementos · {{ timeline.totalAlertas }} alertas
        <span
          v-if="timeline.truncada"
          class="truncada"
        >· hay más resultados: se muestran los más recientes, acote el rango</span>
      </p>

      <ol class="cronologia">
        <li
          v-for="i in timeline.items"
          :key="`${i.tipo}-${i.tipo === 'evento' ? i.evento.id : i.alerta.id}`"
          class="elemento"
          :class="i.tipo === 'alerta' ? `alerta sev-${i.alerta.severidad}` : `evento tipo-${i.evento.event_type}`"
        >
          <time class="hora">{{ fecha(i.ts) }}</time>
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
              <span
                class="chip"
                :class="`sev-${i.alerta.severidad}`"
              >{{ i.alerta.severidad.toUpperCase() }}</span>
              {{ i.alerta.regla_id }} · {{ i.alerta.nombre }}
            </p>
            <p class="meta">
              {{ i.alerta.clave }} · cantidad {{ i.alerta.cantidad }} · MITRE {{ i.alerta.mitre }} · {{ i.alerta.estado }}
            </p>
          </div>
        </li>
        <li
          v-if="timeline.items.length === 0"
          class="vacio"
        >
          Sin eventos ni alertas en ese rango.
        </li>
      </ol>
    </template>
  </main>
</template>

<style scoped>
.linea {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--esp-5);
}
.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
  align-items: end;
  margin-bottom: var(--esp-4);
}
.filtros label {
  display: flex;
  flex-direction: column;
  font-size: var(--texto-xs);
  color: var(--color-texto-2);
  gap: 0.2rem;
}
.resumen {
  font-size: var(--texto-s);
  color: var(--color-texto-2);
}
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
.hora {
  flex: 0 0 11rem;
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
.chip {
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
