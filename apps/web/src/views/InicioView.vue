<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

const puedeVerificar = computed(() => auth.rol === 'admin' || auth.rol === 'auditor');

async function cerrarSesion(): Promise<void> {
  await auth.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <main class="inicio">
    <header>
      <h1>SIEM Forense</h1>
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
    <nav class="secciones">
      <RouterLink to="/eventos">
        Eventos
      </RouterLink>
      <RouterLink to="/alertas">
        Alertas
      </RouterLink>
      <RouterLink to="/linea-tiempo">
        Línea de tiempo
      </RouterLink>
      <RouterLink
        v-if="puedeVerificar"
        to="/verificar"
      >
        Verificar cadena
      </RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.inicio {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  color: #1f2933;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #cbd2d9;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}
h1 {
  margin: 0;
  font-size: 1.25rem;
}
.sesion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #52606d;
  font-size: 0.9rem;
}
button {
  padding: 0.4rem 0.75rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
.secciones {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.secciones a {
  color: #2b6cb0;
  font-weight: 600;
  text-decoration: none;
}
</style>
