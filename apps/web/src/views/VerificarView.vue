<script setup lang="ts">
import { ref } from 'vue';
import type { ForenseVerificacion, MotivoForense, Problem } from '@siem/shared';

import AvisoError from '../components/AvisoError.vue';
import { verificarCadena } from '../api/forensics.api.js';
import { extraerProblem } from '../api/http.js';

type Estado = 'idle' | 'loading' | 'success' | 'error';

const MOTIVOS: Record<MotivoForense, string> = {
  evento_alterado: 'Un evento fue modificado después de sellarse.',
  cadena_rota: 'El encadenamiento no coincide con el eslabón anterior.',
  eslabon_faltante: 'Falta un eslabón en la secuencia.',
  evento_sin_sellar: 'Hay un evento sin eslabón dentro del rango sellado.',
};

const estado = ref<Estado>('idle');
const resultado = ref<ForenseVerificacion | null>(null);
const error = ref<Problem | null>(null);
const verificadaEn = ref<Date | null>(null);

async function verificar(): Promise<void> {
  estado.value = 'loading';
  error.value = null;
  resultado.value = null;
  try {
    resultado.value = await verificarCadena();
    verificadaEn.value = new Date();
    estado.value = 'success';
  } catch (e) {
    error.value = extraerProblem(e);
    estado.value = 'error';
  }
}
</script>

<template>
  <main class="pagina estrecha">
    <header class="cabecera-pagina">
      <h1>Verificar cadena forense</h1>
    </header>

    <section class="panel explicacion">
      <p>
        Cada evento se sella al guardarse con un HMAC que incluye el sello del evento anterior.
        La verificación recalcula la cadena completa y comprueba que ningún evento fue
        <strong>alterado</strong>, <strong>borrado</strong> o <strong>insertado</strong>.
      </p>
      <button
        type="button"
        class="primario"
        :disabled="estado === 'loading'"
        @click="verificar"
      >
        {{ estado === 'loading' ? 'Verificando…' : 'Verificar cadena' }}
      </button>
    </section>

    <AvisoError
      v-if="estado === 'error'"
      class="resultado-error"
      :problema="error"
      por-defecto="No se pudo verificar la cadena"
    />

    <template v-else-if="estado === 'success' && resultado">
      <div
        v-if="resultado.integra"
        class="recuadro ok"
        role="status"
      >
        <span
          class="icono"
          aria-hidden="true"
        >✓</span>
        <div>
          <p class="titulo">
            Cadena íntegra
          </p>
          <p>Se verificaron {{ resultado.eslabones }} eslabones sin alteraciones.</p>
          <p
            v-if="verificadaEn"
            class="total"
          >
            Verificada el {{ verificadaEn.toLocaleString() }}.
          </p>
        </div>
      </div>
      <div
        v-else
        class="recuadro fallo"
        role="alert"
      >
        <span
          class="icono"
          aria-hidden="true"
        >✗</span>
        <div>
          <p class="titulo">
            Cadena comprometida
          </p>
          <p v-if="resultado.primerFallo">
            Primer fallo en la secuencia <strong>{{ resultado.primerFallo.secuencia ?? '—' }}</strong>
            (evento {{ resultado.primerFallo.eventoId ?? '—' }}).
          </p>
          <p
            v-if="resultado.primerFallo"
            class="motivo"
          >
            {{ MOTIVOS[resultado.primerFallo.motivo] }}
          </p>
          <p class="total">
            Eslabones recorridos: {{ resultado.eslabones }}.
            <template v-if="verificadaEn">
              Verificada el {{ verificadaEn.toLocaleString() }}.
            </template>
          </p>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.explicacion {
  padding: var(--esp-4) 1.25rem;
}
.explicacion p {
  margin: 0 0 var(--esp-4);
  color: var(--color-texto-2);
  font-size: 0.9rem;
}
.explicacion button {
  padding: 0.6rem var(--esp-4);
}
/* Más específico que el margen propio de AvisoError */
.pagina .resultado-error {
  margin-top: 1.25rem;
}
.recuadro {
  display: flex;
  align-items: flex-start;
  gap: var(--esp-4);
  margin-top: 1.25rem;
  padding: var(--esp-4) 1.25rem;
  border-radius: var(--radio-m);
  border: 1px solid;
}
.icono {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: var(--color-superficie);
  font-size: var(--texto-l);
  font-weight: 700;
}
.recuadro .titulo {
  margin: 0 0 0.4rem;
  font-size: 1.1rem;
  font-weight: 700;
}
.recuadro p {
  margin: 0.2rem 0;
}
.ok {
  background: var(--color-ok-suave);
  border-color: var(--color-ok);
  color: var(--color-ok-texto);
}
.ok .icono {
  background: var(--color-ok);
}
.fallo {
  background: var(--color-peligro-suave);
  border-color: var(--color-peligro);
  color: var(--color-peligro-texto);
}
.fallo .icono {
  background: var(--color-peligro);
}
.motivo {
  font-weight: 600;
}
.total {
  font-size: 0.82rem;
}
</style>
