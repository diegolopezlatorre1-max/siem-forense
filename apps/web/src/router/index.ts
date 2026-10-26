import { createRouter, createWebHistory } from 'vue-router';

// Las vistas y los guards async (restaurar sesión, meta.roles) llegan en S5 (docs/06-frontend.md).
export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', name: 'inicio', component: () => import('../views/InicioView.vue') }],
});
