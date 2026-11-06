import { createRouter, createWebHistory } from 'vue-router';

import { registrarGuards } from './guards.js';
import { tituloDocumento } from './menu.js';
import { rutas } from './rutas.js';

export const router = createRouter({
  history: createWebHistory(),
  routes: rutas,
});

registrarGuards(router);

router.afterEach((to) => {
  document.title = tituloDocumento(to.meta);
});
