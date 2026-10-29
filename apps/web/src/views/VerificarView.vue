<script setup lang="ts">
import { ref } from 'vue';
import type { ForenseVerificacion, MotivoForense, Problem } from '@siem/shared';

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

async function verificar(): Promise<void> {
  estado.value = 'loading';
  error.value = null;
  resultado.value = null;
  try {
    resultado.value = await verificarCadena();
    estado.value = 'success';
  } catch (e) {
    error.value = extraerProblem(e);
    estado.value = 'error';
  }
}
</script>

<template>
  <main class="verificar">
    <h1>Verificar cadena forense</h1>
    <p class="intro">
      Recalcula la cadena HMAC completa y comprueba que ningún evento fue alterado, borrado o insertado.
    </p>

    <button
      type="button"
      :disabled="estado === 'loading'"
      @click="verificar"
    >
      {{ estado === 'loading' ? 'Verificando…' : 'Verificar cadena' }}
    </button>

    <p
      v-if="estado === 'error'"
      class="recuadro error"
      role="alert"
    >
      {{ error?.detail ?? error?.title ?? 'No se pudo verificar la cadena' }}
    </p>

    <template v-else-if="estado === 'success' && resultado">
      <div
        v-if="resultado.integra"
        class="recuadro ok"
        role="status"
      >
        <p class="titulo">
          ✓ Cadena íntegra
        </p>
        <p>Se verificaron {{ resultado.eslabones }} eslabones sin alteraciones.</p>
      </div>
      <div
        v-else
        class="recuadro fallo"
        role="alert"
      >
        <p class="titulo">
          ✗ Cadena comprometida
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
        </p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.verificar {
  max-width: 700px;
  margin: 0 auto;
  padding: 1.5rem;
  color: #1f2933;
}
h1 {
  font-size: 1.25rem;
}
.intro {
  color: #52606d;
  font-size: 0.9rem;
}
button {
  padding: 0.6rem 1rem;
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
.recuadro {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border: 1px solid;
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
  background: #e6f4ec;
  border-color: #2f855d;
  color: #22543d;
}
.fallo {
  background: #fde8e8;
  border-color: #c53030;
  color: #9b2c2c;
}
.error {
  background: #fde8e8;
  border-color: #c53030;
  color: #9b2c2c;
}
.motivo {
  font-weight: 600;
}
.total {
  font-size: 0.82rem;
  opacity: 0.85;
}
</style>
