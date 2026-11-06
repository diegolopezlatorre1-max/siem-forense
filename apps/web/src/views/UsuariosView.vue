<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CrearUsuarioSchema, type Rol, RolSchema } from '@siem/shared';

import { useAuthStore } from '../stores/auth.js';
import { useUsersStore } from '../stores/users.js';

const users = useUsersStore();
const auth = useAuthStore();

const roles = RolSchema.options;
const QUE_PUEDE: Record<Rol, string> = {
  admin: 'todo, incluida esta pantalla',
  analista: 'ver eventos y alertas, y tomar y cerrar sus alertas',
  auditor: 'ver eventos y alertas, y verificar la cadena (solo lectura)',
};

const usuario = ref('');
const clave = ref('');
const rol = ref<Rol>('analista');
const aviso = ref<string | null>(null);
const errorLocal = ref<string | null>(null);

// Se valida con el mismo schema que el backend antes de enviar.
async function crear(): Promise<void> {
  aviso.value = null;
  errorLocal.value = null;
  const datos = CrearUsuarioSchema.safeParse({ usuario: usuario.value.trim(), clave: clave.value, rol: rol.value });
  if (!datos.success) {
    errorLocal.value = datos.error.issues.some((i) => i.path[0] === 'clave')
      ? 'La contraseña debe tener al menos 8 caracteres.'
      : 'Revise el nombre de usuario (1 a 60 caracteres).';
    return;
  }
  const creado = await users.crear(datos.data);
  if (creado !== null) {
    aviso.value = `Usuario «${creado.usuario}» creado con rol ${creado.rol}.`;
    usuario.value = '';
    clave.value = ''; // la contraseña no se queda en el formulario
  }
}

onMounted(() => {
  void users.cargar();
});
</script>

<template>
  <main class="usuarios">
    <h1>Usuarios</h1>

    <section class="tarjeta">
      <h2>Nuevo usuario</h2>
      <form
        class="formulario"
        @submit.prevent="crear"
      >
        <label>
          usuario
          <input
            v-model="usuario"
            autocomplete="off"
            maxlength="60"
            required
          >
        </label>
        <label>
          contraseña (mín. 8)
          <input
            v-model="clave"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
          >
        </label>
        <label>
          rol
          <select v-model="rol">
            <option
              v-for="r in roles"
              :key="r"
              :value="r"
            >
              {{ r }}
            </option>
          </select>
        </label>
        <button
          type="submit"
          class="primario"
          :disabled="users.creando"
        >
          {{ users.creando ? 'Creando…' : 'Crear' }}
        </button>
      </form>
      <p class="ayuda">
        {{ rol }}: {{ QUE_PUEDE[rol] }}.
      </p>
      <p
        v-if="errorLocal"
        class="aviso error"
        role="alert"
      >
        {{ errorLocal }}
      </p>
      <p
        v-else-if="users.errorCrear"
        class="aviso error"
        role="alert"
      >
        {{ users.errorCrear.status === 409 ? 'Ese nombre de usuario ya existe.' : (users.errorCrear.detail ?? users.errorCrear.title) }}
      </p>
      <p
        v-else-if="aviso"
        class="aviso ok"
        role="status"
      >
        {{ aviso }}
      </p>
    </section>

    <p
      v-if="users.status === 'loading'"
      class="aviso"
    >
      Cargando…
    </p>
    <p
      v-else-if="users.status === 'error'"
      class="aviso error"
      role="alert"
    >
      {{ users.error?.detail ?? users.error?.title ?? 'No se pudieron cargar los usuarios' }}
    </p>
    <table v-else>
      <thead>
        <tr>
          <th>id</th>
          <th>usuario</th>
          <th>rol</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="u in users.lista"
          :key="u.id"
        >
          <td>{{ u.id }}</td>
          <td>
            {{ u.usuario }}
            <span
              v-if="u.id === auth.usuario?.id"
              class="tu"
            >(tú)</span>
          </td>
          <td>
            <span
              class="rol"
              :class="`rol-${u.rol}`"
            >{{ u.rol }}</span>
          </td>
        </tr>
        <tr v-if="users.lista.length === 0">
          <td
            colspan="3"
            class="vacio"
          >
            Sin usuarios.
          </td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<style scoped>
.usuarios {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--esp-5);
}
h2 {
  margin: 0 0 var(--esp-3);
}
.tarjeta {
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-m);
  padding: var(--esp-4) 1.25rem;
  margin-bottom: var(--esp-5);
  background: var(--color-superficie);
  box-shadow: var(--sombra-1);
}
.formulario {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
  align-items: end;
}
.formulario label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: var(--texto-xs);
  color: var(--color-texto-2);
}
.ayuda {
  margin: 0.6rem 0 0;
  font-size: 0.8rem;
  color: var(--color-texto-2);
}
table {
  font-size: 0.9rem;
}
.tu {
  color: var(--color-texto-3);
  font-size: 0.8rem;
}
.rol {
  font-size: var(--texto-xs);
  font-weight: 700;
  padding: 0.1rem var(--esp-2);
  border-radius: var(--radio-pill);
  background: var(--color-neutro-suave);
  color: var(--color-neutro-texto);
}
.rol-admin {
  background: var(--color-peligro-suave);
  color: var(--color-peligro-texto);
}
.rol-analista {
  background: var(--color-primario-suave);
  color: var(--color-primario);
}
.rol-auditor {
  background: var(--color-ok-suave);
  color: var(--color-ok-texto);
}
.aviso {
  padding: var(--esp-2) 0 0;
}
</style>
