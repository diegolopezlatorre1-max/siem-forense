<script setup lang="ts">
withDefaults(defineProps<{ texto?: string }>(), { texto: 'Cargando…' });
</script>

<template>
  <p
    class="cargando"
    role="status"
  >
    <span
      class="giro"
      aria-hidden="true"
    />
    {{ texto }}
  </p>
</template>

<style scoped>
.cargando {
  display: flex;
  align-items: center;
  gap: var(--esp-2);
  margin: 0;
  padding: var(--esp-4) 0;
  color: var(--color-texto-3);
}
.giro {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-borde);
  border-top-color: var(--color-primario);
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}
@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .giro {
    animation-duration: 2.4s;
  }
}
</style>
