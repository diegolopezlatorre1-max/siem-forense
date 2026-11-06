<script setup lang="ts">
// Mensaje para listas y tablas sin resultados. El texto va en el slot.
</script>

<template>
  <div class="estado-vacio">
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-4-4" />
    </svg>
    <p><slot /></p>
  </div>
</template>

<style scoped>
.estado-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--esp-2);
  padding: var(--esp-6) var(--esp-4);
  color: var(--color-texto-3);
  text-align: center;
}
svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
p {
  margin: 0;
  font-size: var(--texto-s);
}
</style>
