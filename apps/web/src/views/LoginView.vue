<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { extraerProblem } from '../api/http.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const usuario = ref('');
const clave = ref('');
const error = ref<string | null>(null);
const enviando = ref(false);

async function enviar(): Promise<void> {
  error.value = null;
  enviando.value = true;
  try {
    await auth.login({ usuario: usuario.value, clave: clave.value });
    const redirect = route.query.redirect;
    await router.push(typeof redirect === 'string' ? redirect : { name: 'inicio' });
  } catch (e) {
    const problem = extraerProblem(e);
    // Toma el primer texto no vacío; algunos 401 llegan sin cuerpo problem+json.
    const mensaje = (problem?.detail?.trim() ?? '') || (problem?.title?.trim() ?? '');
    error.value = mensaje !== '' ? mensaje : 'No se pudo iniciar sesión';
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <main class="login">
    <form
      class="tarjeta"
      @submit.prevent="enviar"
    >
      <h1>SIEM Forense</h1>
      <p class="sub">
        Iniciar sesión
      </p>

      <label>
        Usuario
        <input
          v-model="usuario"
          name="usuario"
          autocomplete="username"
          required
        >
      </label>
      <label>
        Clave
        <input
          v-model="clave"
          name="clave"
          type="password"
          autocomplete="current-password"
          required
        >
      </label>

      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="enviando"
      >
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f7f9fb;
}
.tarjeta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(360px, 90vw);
  padding: 2rem;
  background: #fff;
  border: 1px solid #cbd2d9;
  border-radius: 10px;
}
h1 {
  margin: 0;
  font-size: 1.25rem;
}
.sub {
  margin: 0 0 0.5rem;
  color: #52606d;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #1f2933;
}
input {
  padding: 0.5rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
}
button {
  margin-top: 0.5rem;
  padding: 0.6rem;
  border: 0;
  border-radius: 6px;
  background: #2b6cb0;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: default;
}
.error {
  margin: 0;
  color: #c53030;
  font-size: 0.9rem;
}
</style>
