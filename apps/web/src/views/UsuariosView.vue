<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CrearUsuarioSchema, type Rol, RolSchema } from '@siem/shared';

import AvisoError from '../components/AvisoError.vue';
import EstadoVacio from '../components/EstadoVacio.vue';
import IndicadorCarga from '../components/IndicadorCarga.vue';
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
  <main class="pagina estrecha">
    <header class="cabecera-pagina">
      <h1>Usuarios</h1>
      <p>{{ users.lista.length }} usuarios</p>
    </header>

    <section class="tarjeta panel">
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
      <AvisoError
        v-if="errorLocal"
        class="aviso-form"
      >
        {{ errorLocal }}
      </AvisoError>
      <AvisoError
        v-else-if="users.errorCrear"
        class="aviso-form"
      >
        {{ users.errorCrear.status === 409 ? 'Ese nombre de usuario ya existe.' : (users.errorCrear.detail ?? users.errorCrear.title) }}
      </AvisoError>
      <p
        v-else-if="aviso"
        class="aviso ok"
        role="status"
      >
        {{ aviso }}
      </p>
    </section>

    <IndicadorCarga v-if="users.status === 'loading'" />
    <AvisoError
      v-else-if="users.status === 'error'"
      :problema="users.error"
      por-defecto="No se pudieron cargar los usuarios"
    />
    <div
      v-else
      class="panel tabla-contenedor"
    >
      <table>
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
                class="chip"
                :class="`rol-${u.rol}`"
              >{{ u.rol }}</span>
            </td>
          </tr>
          <tr v-if="users.lista.length === 0">
            <td colspan="3">
              <EstadoVacio>Sin usuarios.</EstadoVacio>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<style scoped>
h2 {
  margin: 0 0 var(--esp-3);
}
.tarjeta {
  padding: var(--esp-4) 1.25rem;
  margin-bottom: var(--esp-5);
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
/* Más específico que el margen propio de AvisoError */
.tarjeta .aviso-form {
  margin: var(--esp-3) 0 0;
}
table {
  font-size: 0.9rem;
}
.tu {
  color: var(--color-texto-3);
  font-size: 0.8rem;
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
