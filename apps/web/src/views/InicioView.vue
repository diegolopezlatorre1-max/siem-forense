<script setup lang="ts">
import { SeveridadSchema } from '@siem/shared';

const severidades = SeveridadSchema.options;
</script>

<template>
  <main>
    <h1>SIEM Forense</h1>
    <p>Frontend en construcción (Sprint 5). Severidades: {{ severidades.join(', ') }}</p>
  </main>
</template>
