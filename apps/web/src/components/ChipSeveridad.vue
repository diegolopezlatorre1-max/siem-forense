<script setup lang="ts">
import type { Severidad } from '@siem/shared';

import { ETIQUETA_SEVERIDAD } from './etiquetas.js';

defineProps<{ severidad: Severidad }>();
</script>

<template>
  <span
    class="chip"
    :class="`sev-${severidad}`"
  >{{ ETIQUETA_SEVERIDAD[severidad] }}</span>
</template>
