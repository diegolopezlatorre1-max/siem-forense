<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import type { Severidad } from '@siem/shared';

import AvisoError from '../components/AvisoError.vue';
import { ETIQUETA_SEVERIDAD } from '../components/etiquetas.js';
import { seccionesPara } from '../router/menu.js';
import { useAuthStore } from '../stores/auth.js';
import { useResumenStore } from '../stores/resumen.js';
import { useUiStore } from '../stores/ui.js';

const auth = useAuthStore();
const resumen = useResumenStore();
const ui = useUiStore();
const router = useRouter();

// Las mismas secciones del menú, con una línea que explica cada una.
const DESCRIPCIONES: Record<string, string> = {
  eventos: 'Eventos recibidos de los agentes de Linux y Windows, con filtros.',
  alertas: 'Alertas de las reglas de detección: tomarlas y cambiar su estado.',
  'linea-tiempo': 'Eventos y alertas de un host, un usuario o una IP, en orden.',
  verificar: 'Comprobar que ningún evento fue alterado (cadena HMAC).',
  admin: 'Crear usuarios y ver sus roles.',
};

// De la más grave a la menos grave.
const ORDEN: Severidad[] = ['critical', 'high', 'medium', 'low'];

const secciones = computed(() => seccionesPara(router.options.routes, auth.rol));

// Abre Alertas filtrada por las abiertas de esa severidad.
function verAbiertas(severidad: Severidad): void {
  ui.filtrosAlertas = { estado: 'abierta', severidad, regla_id: '' };
  void router.push({ name: 'alertas' });
}

function verEnProgreso(): void {
  ui.filtrosAlertas = { estado: 'en_progreso', severidad: '', regla_id: '' };
  void router.push({ name: 'alertas' });
}

onMounted(() => {
  void resumen.cargar();
});
</script>

<template>
  <main class="pagina">
    <header class="cabecera-pagina">
      <h1>Hola, {{ auth.usuario?.usuario }}</h1>
      <p>Rol: {{ auth.rol }}</p>
    </header>

    <section
      class="resumen panel"
      aria-labelledby="titulo-resumen"
    >
      <div class="resumen-cabecera">
        <h2 id="titulo-resumen">
          Alertas abiertas
        </h2>
        <button
          type="button"
          class="refrescar"
          :disabled="resumen.status === 'loading'"
          @click="resumen.cargar(true)"
        >
          {{ resumen.status === 'loading' ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </div>

      <AvisoError
        v-if="resumen.status === 'error'"
        :problema="resumen.error"
        por-defecto="No se pudo cargar el resumen de alertas"
      />
      <div
        v-else
        class="cifras"
        :aria-busy="resumen.status === 'loading'"
      >
        <div class="cifra total">
          <span class="numero">{{ resumen.status === 'success' ? resumen.totalAbiertas : '–' }}</span>
          <span class="etiqueta">abiertas en total</span>
        </div>
        <button
          v-for="s in ORDEN"
          :key="s"
          type="button"
          class="cifra"
          :class="`sev-${s}`"
          @click="verAbiertas(s)"
        >
          <span class="numero">{{ resumen.status === 'success' ? resumen.abiertas[s] : '–' }}</span>
          <span class="etiqueta">{{ ETIQUETA_SEVERIDAD[s] }}</span>
        </button>
        <button
          type="button"
          class="cifra progreso"
          @click="verEnProgreso"
        >
          <span class="numero">{{ resumen.status === 'success' ? resumen.enProgreso : '–' }}</span>
          <span class="etiqueta">en progreso</span>
        </button>
      </div>
    </section>

    <h2 class="titulo-secciones">
      Secciones
    </h2>
    <ul class="secciones">
      <li
        v-for="s in secciones"
        :key="s.nombre"
      >
        <RouterLink :to="s.ruta">
          <span class="titulo">{{ s.titulo }}</span>
          <span class="texto">{{ DESCRIPCIONES[s.nombre] }}</span>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.resumen {
  padding: var(--esp-4) 1.25rem;
}
.resumen-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--esp-3);
  margin-bottom: var(--esp-3);
}
.resumen-cabecera h2 {
  margin: 0;
}
.refrescar {
  padding: var(--esp-1) 0.7rem;
}
.cifras {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--esp-3);
}
.cifra {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  padding: var(--esp-3) var(--esp-4);
  border: 1px solid var(--color-borde);
  border-left: 5px solid var(--color-neutro);
  border-radius: var(--radio-m);
  background: var(--color-superficie);
  color: var(--color-texto);
  text-align: left;
}
button.cifra:hover:not(:disabled) {
  border-color: var(--color-borde-fuerte);
  background: var(--color-superficie-2);
  box-shadow: var(--sombra-2);
}
.cifra.total {
  border-left-color: var(--color-texto);
  background: var(--color-superficie-2);
}
.cifra.sev-critical {
  border-left-color: var(--color-sev-critical);
}
.cifra.sev-high {
  border-left-color: var(--color-sev-high);
}
.cifra.sev-medium {
  border-left-color: var(--color-sev-medium);
}
.cifra.sev-low {
  border-left-color: var(--color-sev-low);
}
.cifra.progreso {
  border-left-color: var(--color-aviso);
}
/* Mantiene el color del borde de severidad también al pasar el ratón */
button.cifra.sev-critical:hover:not(:disabled) {
  border-left-color: var(--color-sev-critical);
}
button.cifra.sev-high:hover:not(:disabled) {
  border-left-color: var(--color-sev-high);
}
button.cifra.sev-medium:hover:not(:disabled) {
  border-left-color: var(--color-sev-medium);
}
button.cifra.sev-low:hover:not(:disabled) {
  border-left-color: var(--color-sev-low);
}
button.cifra.progreso:hover:not(:disabled) {
  border-left-color: var(--color-aviso);
}
.numero {
  font-size: var(--texto-xl);
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.etiqueta {
  color: var(--color-texto-2);
  font-size: var(--texto-s);
  font-weight: 600;
}
.titulo-secciones {
  margin: var(--esp-5) 0 var(--esp-3);
}
.secciones {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--esp-3);
  list-style: none;
  margin: 0;
  padding: 0;
}
.secciones a {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  height: 100%;
  padding: 0.9rem var(--esp-4);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-m);
  background: var(--color-superficie);
  box-shadow: var(--sombra-1);
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.secciones a:hover {
  border-color: var(--color-primario);
  box-shadow: var(--sombra-2);
}
.titulo {
  color: var(--color-primario);
  font-weight: 700;
}
.texto {
  color: var(--color-texto-2);
  font-size: var(--texto-s);
}
</style>
