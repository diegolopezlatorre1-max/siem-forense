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
        class="primario"
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
}
.tarjeta {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  width: min(360px, 90vw);
  padding: var(--esp-6);
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-l);
  box-shadow: var(--sombra-2);
}
h1 {
  margin: 0;
}
.sub {
  margin: 0 0 var(--esp-2);
  color: var(--color-texto-2);
}
label {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  font-size: 0.9rem;
}
input {
  padding: var(--esp-2);
}
button {
  margin-top: var(--esp-2);
  padding: 0.6rem;
}
.error {
  margin: 0;
  color: var(--color-peligro-texto);
  font-size: 0.9rem;
}
</style>
