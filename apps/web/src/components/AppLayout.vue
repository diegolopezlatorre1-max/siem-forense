<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import { seccionesPara } from '../router/menu.js';
import { useAuthStore } from '../stores/auth.js';

// Marco de todas las vistas con sesión: marca, menú por rol y cierre de sesión.
const auth = useAuthStore();
const router = useRouter();

const secciones = computed(() => seccionesPara(router.options.routes, auth.rol));

async function cerrarSesion(): Promise<void> {
  await auth.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <div class="marco">
    <header class="barra">
      <RouterLink
        to="/"
        class="marca"
      >
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
        <span>{{ auth.usuario.usuario }} · {{ auth.usuario.rol }}</span>
        <button
          type="button"
          @click="cerrarSesion"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
    <slot />
  </div>
</template>

<style scoped>
.barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-2) var(--esp-5);
  padding: 0.6rem var(--esp-5);
  border-bottom: 1px solid var(--color-borde);
  background: var(--color-superficie);
  box-shadow: var(--sombra-1);
}
.marca {
  font-weight: 700;
  color: var(--color-texto);
  text-decoration: none;
}
.menu {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1);
  flex: 1;
}
.menu a {
  padding: 0.35rem 0.7rem;
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
  gap: var(--esp-3);
  color: var(--color-texto-2);
  font-size: var(--texto-s);
}
.sesion button {
  padding: 0.35rem 0.7rem;
}
@media (max-width: 640px) {
  .barra {
    padding: 0.6rem var(--esp-4);
  }
  .menu {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
