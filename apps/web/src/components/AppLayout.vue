<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import { seccionesPara } from '../router/menu.js';
import { useAuthStore } from '../stores/auth.js';

// Marco de todas las vistas con sesión: marca, menú por rol y cierre de sesión.
const auth = useAuthStore();
const router = useRouter();

const secciones = computed(() => seccionesPara(router.options.routes, auth.rol));
const inicial = computed(() => auth.usuario?.usuario.charAt(0).toUpperCase() ?? '?');

async function cerrarSesion(): Promise<void> {
  await auth.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <div class="marco">
    <header class="barra">
      <div class="contenido">
        <RouterLink
          to="/"
          class="marca"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
          >
            <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          SIEM Forense
        </RouterLink>
        <nav
          class="menu"
          aria-label="Secciones"
        >
          <RouterLink
            v-for="s in secciones"
            :key="s.nombre"
            :to="s.ruta"
            active-class="activa"
          >
            {{ s.titulo }}
          </RouterLink>
        </nav>
        <div
          v-if="auth.usuario"
          class="sesion"
        >
          <span
            class="avatar"
            aria-hidden="true"
          >{{ inicial }}</span>
          <span class="quien">
            <span class="nombre">{{ auth.usuario.usuario }}</span>
            <span class="rol">{{ auth.usuario.rol }}</span>
          </span>
          <button
            type="button"
            @click="cerrarSesion"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
    <slot />
  </div>
</template>

<style scoped>
.barra {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--color-borde);
  background: var(--color-superficie);
  box-shadow: var(--sombra-1);
}
.contenido {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2) var(--esp-5);
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--esp-2) var(--esp-5);
}
.marca {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  font-weight: 700;
  color: var(--color-texto);
  text-decoration: none;
}
.marca svg {
  fill: none;
  stroke: var(--color-primario);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.menu {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1);
  flex: 1;
}
.menu a {
  padding: 0.4rem 0.75rem;
  border-radius: var(--radio-s);
  color: var(--color-texto-2);
  font-weight: 600;
  font-size: var(--texto-s);
  text-decoration: none;
}
.menu a:hover {
  background: var(--color-superficie-2);
  color: var(--color-texto);
}
.menu a.activa {
  background: var(--color-primario-suave);
  color: var(--color-primario);
}
.sesion {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  font-size: var(--texto-s);
}
.avatar {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-primario-suave);
  color: var(--color-primario);
  font-weight: 700;
}
.quien {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  margin-right: var(--esp-2);
}
.nombre {
  font-weight: 600;
}
.rol {
  color: var(--color-texto-3);
  font-size: var(--texto-xs);
}
.sesion button {
  padding: 0.35rem 0.7rem;
}
@media (max-width: 640px) {
  .contenido {
    padding: var(--esp-2) var(--esp-4);
  }
  .menu {
    order: 3;
    flex-basis: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  .menu a {
    white-space: nowrap;
  }
}
</style>
