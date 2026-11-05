import { createRouter, createWebHistory } from 'vue-router';

import { registrarGuards } from './guards.js';
import { rutas } from './rutas.js';

export const router = createRouter({
  history: createWebHistory(),
  routes: rutas,
});

registrarGuards(router);
