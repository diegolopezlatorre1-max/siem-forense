<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import { seccionesPara } from '../router/menu.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

// Las mismas secciones del menú, con una línea que explica cada una.
const DESCRIPCIONES: Record<string, string> = {
  eventos: 'Eventos recibidos de los agentes de Linux y Windows, con filtros.',
  alertas: 'Alertas de las reglas de detección: tomarlas y cambiar su estado.',
  'linea-tiempo': 'Eventos y alertas de un host, un usuario o una IP, en orden.',
  verificar: 'Comprobar que ningún evento fue alterado (cadena HMAC).',
  admin: 'Crear usuarios y ver sus roles.',
};

const secciones = computed(() => seccionesPara(router.options.routes, auth.rol));
</script>

<template>
  <main class="inicio">
    <h1>Hola, {{ auth.usuario?.usuario }}</h1>
    <p class="rol">
      Rol: {{ auth.rol }}
    </p>
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
.inicio {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--esp-5);
}
h1 {
  margin: 0;
}
.rol {
  color: var(--color-texto-2);
  font-size: 0.9rem;
}
.secciones {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--esp-3);
  list-style: none;
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
