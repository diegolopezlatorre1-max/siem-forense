<script setup lang="ts">
import type { EstadoAlerta } from '@siem/shared';

import { ETIQUETA_ESTADO } from './etiquetas.js';

defineProps<{ estado: EstadoAlerta }>();
</script>

<template>
  <span
    class="chip"
    :class="`est-${estado}`"
  >{{ ETIQUETA_ESTADO[estado] }}</span>
</template>
