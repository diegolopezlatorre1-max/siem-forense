<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <main class="forbidden">
    <h1>403</h1>
    <p>Tu rol no tiene acceso a esta sección.</p>
    <RouterLink to="/">
      Volver al inicio
    </RouterLink>
  </main>
</template>

<style scoped>
.forbidden {
  min-height: 100vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.5rem;
  text-align: center;
  color: #1f2933;
}
h1 {
  margin: 0;
  font-size: 3rem;
  color: #c53030;
}
</style>
