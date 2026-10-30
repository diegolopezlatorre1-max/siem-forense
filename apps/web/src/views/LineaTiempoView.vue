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
.filtros input {
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
.filtros button:disabled {
  opacity: 0.5;
  cursor: default;
}
.filtros button[type='button'] {
  background: #fff;
  color: #2b6cb0;
}
.resumen {
  font-size: 0.85rem;
  color: #52606d;
}
.truncada {
  color: #975a16;
}
.cronologia {
  list-style: none;
  margin: 0;
  padding: 0 0 0 0.75rem;
  border-left: 2px solid #cbd2d9;
}
.elemento {
  position: relative;
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0 0.5rem 1rem;
  font-size: 0.85rem;
}
.elemento::before {
  content: '';
  position: absolute;
  left: -0.75rem;
  top: 0.85rem;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 50%;
  background: #9aa5b1;
}
.elemento.tipo-login_success::before {
  background: #276749;
}
.elemento.tipo-user_created::before {
  background: #975a16;
}
.elemento.alerta {
  border: 1px solid #e4e7eb;
  border-left: 4px solid #c53030;
  border-radius: 6px;
  margin: 0.4rem 0;
  background: #fffafa;
}
.elemento.alerta::before {
  background: #c53030;
  width: 14px;
  height: 14px;
  margin-left: -7px;
}
.elemento.alerta.sev-medium {
  border-left-color: #b7791f;
  background: #fffcf5;
}
.elemento.alerta.sev-low {
  border-left-color: #2b6cb0;
  background: #f7fafd;
}
.hora {
  flex: 0 0 11rem;
  color: #52606d;
  font-family: Consolas, monospace;
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
  color: #52606d;
}
.raw {
  font-family: Consolas, monospace;
  font-size: 0.75rem;
  color: #616e7c;
  overflow-wrap: anywhere;
}
.chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 10px;
  margin-right: 0.3rem;
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
.vacio,
.aviso {
  color: #718096;
  padding: 1rem 0;
}
.aviso.error {
  color: #c53030;
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
