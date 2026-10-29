import { createRouter, createWebHistory } from 'vue-router';
import type { Rol } from '@siem/shared';

import { registrarGuards } from './guards.js';

// Tipado de los metadatos de ruta usados por los guards.
declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean; // ruta accesible sin sesión
    roles?: readonly Rol[]; // roles permitidos; si falta, basta estar autenticado
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      meta: { public: true },
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/403',
      name: 'forbidden',
      meta: { public: true },
      component: () => import('../views/ForbiddenView.vue'),
    },
    {
      path: '/',
      name: 'inicio',
      component: () => import('../views/InicioView.vue'),
    },
  ],
});

registrarGuards(router);
