import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { configurarHttp } from './api/http.js';
import { router } from './router/index.js';
import { useAuthStore } from './stores/auth.js';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Conecta el cliente Axios con la sesión (token, refresh en cola y fallo de auth).
const auth = useAuthStore();
configurarHttp({
  obtenerToken: () => auth.accessToken,
  refrescar: () => auth.restaurarSesion(),
  onFalloAuth: () => {
    auth.limpiarSesion();
    if (router.currentRoute.value.name !== 'login') {
      void router.push({ name: 'login' });
    }
  },
});

app.mount('#app');
