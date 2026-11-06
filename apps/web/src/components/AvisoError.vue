<script setup lang="ts">
import type { Problem } from '@siem/shared';

// Muestra un problem+json de la API: detail si lo trae, si no title, si no el texto por defecto.
// Con slot, el texto lo da quien lo usa (errores locales o mensajes a medida).
defineProps<{ problema?: Problem | null; porDefecto?: string }>();
</script>

<template>
  <p
    class="aviso-error"
    role="alert"
  >
    <span
      class="icono"
      aria-hidden="true"
    >!</span>
    <span><slot>{{ problema?.detail ?? problema?.title ?? porDefecto ?? 'Ocurrió un error' }}</slot></span>
  </p>
</template>

<style scoped>
.aviso-error {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-2);
  margin: 0 0 var(--esp-4);
  padding: var(--esp-3) var(--esp-4);
  border: 1px solid var(--color-peligro);
  border-radius: var(--radio-m);
  background: var(--color-peligro-suave);
  color: var(--color-peligro-texto);
  font-size: var(--texto-s);
}
.icono {
  display: grid;
  place-items: center;
  flex: 0 0 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: var(--color-peligro);
  color: var(--color-superficie);
  font-size: var(--texto-xs);
  font-weight: 700;
}
</style>
