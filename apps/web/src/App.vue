<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AppLayout from './components/AppLayout.vue';

const route = useRoute();

// Login y 403 van sin menú. Antes de la primera navegación (matched vacío) tampoco
// se pinta, para no mostrar el menú un instante a quien el guard mandará al login.
const conMenu = computed(() => route.matched.length > 0 && route.meta.public !== true);
</script>

<template>
  <AppLayout v-if="conMenu">
    <RouterView />
  </AppLayout>
  <RouterView v-else />
</template>
