<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AvisoError from '../components/AvisoError.vue';
import { extraerProblem } from '../api/http.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const usuario = ref('');
const clave = ref('');
const verClave = ref(false);
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
      aria-labelledby="titulo-login"
      @submit.prevent="enviar"
    >
      <div class="marca">
        <svg
          viewBox="0 0 24 24"
          width="36"
          height="36"
          aria-hidden="true"
        >
          <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <div>
          <h1 id="titulo-login">
            SIEM Forense
          </h1>
          <p class="sub">
            Iniciar sesión
          </p>
        </div>
      </div>

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
        <span class="campo-clave">
          <input
            v-model="clave"
            name="clave"
            :type="verClave ? 'text' : 'password'"
            autocomplete="current-password"
            required
          >
          <button
            type="button"
            class="ver-clave"
            :aria-pressed="verClave"
            @click="verClave = !verClave"
          >
            {{ verClave ? 'Ocultar' : 'Mostrar' }}<span class="solo-lector"> la clave</span>
          </button>
        </span>
      </label>

      <AvisoError
        v-if="error"
        class="error"
      >
        {{ error }}
      </AvisoError>

      <button
        type="submit"
        class="primario entrar"
        :disabled="enviando"
      >
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>

      <p class="nota">
        Acceso solo para personal autorizado. Las acciones quedan registradas.
      </p>
    </form>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--esp-4);
  background:
    radial-gradient(circle at 20% 10%, var(--color-primario-suave), transparent 45%),
    radial-gradient(circle at 85% 90%, var(--color-primario-suave), transparent 40%),
    var(--color-fondo);
}
.tarjeta {
  display: flex;
  flex-direction: column;
  gap: var(--esp-3);
  width: min(380px, 100%);
  padding: var(--esp-6);
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-l);
  box-shadow: var(--sombra-2);
}
.marca {
  display: flex;
  align-items: center;
  gap: var(--esp-3);
  margin-bottom: var(--esp-2);
}
.marca svg {
  flex: none;
  fill: none;
  stroke: var(--color-primario);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
h1 {
  margin: 0;
}
.sub {
  margin: 0;
  color: var(--color-texto-2);
}
label {
  display: flex;
  flex-direction: column;
  gap: var(--esp-1);
  font-size: 0.9rem;
  font-weight: 600;
}
input {
  padding: var(--esp-2);
  font-weight: 400;
}
.campo-clave {
  display: flex;
  gap: var(--esp-2);
}
.campo-clave input {
  flex: 1;
  min-width: 0;
}
.ver-clave {
  padding: var(--esp-1) 0.6rem;
  font-size: var(--texto-xs);
}
.tarjeta .error {
  margin: 0;
}
.entrar {
  margin-top: var(--esp-2);
  padding: 0.6rem;
}
.nota {
  margin: var(--esp-2) 0 0;
  color: var(--color-texto-3);
  font-size: var(--texto-xs);
  text-align: center;
}
</style>
