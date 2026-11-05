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
  gap: 0.5rem 1.5rem;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid #cbd2d9;
  background: #f5f7fa;
}
.marca {
  font-weight: 700;
  color: #1f2933;
  text-decoration: none;
}
.menu {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  flex: 1;
}
.menu a {
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  color: #2b6cb0;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}
.menu a:hover {
  background: #ebf2fa;
}
.menu a.activa {
  background: #2b6cb0;
  color: #fff;
}
.sesion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #52606d;
  font-size: 0.85rem;
}
.sesion button {
  padding: 0.35rem 0.7rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
@media (max-width: 640px) {
  .barra {
    padding: 0.6rem 1rem;
  }
  .menu {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
