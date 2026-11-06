import type { ClaimsAcceso } from '../auth/tokens.service.js';

// Ownership de alertas (ABAC). Funciones puras: se usan en el PolicyGuard (Sprint 6) y en pruebas.
export interface AlertaOwnership {
  asignada_a: number | null;
}

/** Cambiar el estado: el admin siempre; el analista solo si la alerta está asignada a él. */
export const alertaPuedeModificar = (usuario: ClaimsAcceso, alerta: AlertaOwnership): boolean =>
  usuario.rol === 'admin' || (usuario.rol === 'analista' && alerta.asignada_a === usuario.sub);

/** Asignar: el admin a cualquiera; el analista solo a sí mismo. */
export const alertaPuedeAsignar = (usuario: ClaimsAcceso, objetivoUsuarioId: number): boolean =>
  usuario.rol === 'admin' || (usuario.rol === 'analista' && objetivoUsuarioId === usuario.sub);
