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
  padding: 1.5rem;
  color: #1f2933;
}
h1 {
  font-size: 1.25rem;
}
h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}
.tarjeta {
  border: 1px solid #e4e7eb;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}
.formulario {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: end;
}
.formulario label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #52606d;
}
.formulario input,
.formulario select {
  padding: 0.4rem;
  border: 1px solid #9aa5b1;
  border-radius: 6px;
}
.formulario button {
  padding: 0.45rem 0.9rem;
  border: 1px solid #2b6cb0;
  border-radius: 6px;
  background: #2b6cb0;
  color: #fff;
  cursor: pointer;
}
.formulario button:disabled {
  opacity: 0.6;
  cursor: default;
}
.ayuda {
  margin: 0.6rem 0 0;
  font-size: 0.8rem;
  color: #52606d;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th,
td {
  border-bottom: 1px solid #e4e7eb;
  padding: 0.45rem 0.5rem;
  text-align: left;
}
th {
  color: #52606d;
  font-weight: 600;
}
.tu {
  color: #718096;
  font-size: 0.8rem;
}
.rol {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  background: #edf0f3;
  color: #3e4c59;
}
.rol-admin {
  background: #fbeaea;
  color: #9b2c2c;
}
.rol-analista {
  background: #ebf2fa;
  color: #2b6cb0;
}
.rol-auditor {
  background: #e6f6ec;
  color: #276749;
}
.aviso {
  color: #718096;
  padding: 0.5rem 0 0;
  margin: 0;
}
.aviso.error {
  color: #c53030;
}
.aviso.ok {
  color: #276749;
}
.vacio {
  color: #718096;
}
</style>
