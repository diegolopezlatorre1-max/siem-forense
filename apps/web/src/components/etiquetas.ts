import type { EstadoAlerta, Severidad } from '@siem/shared';

// Textos visibles de los enums del dominio. El Record obliga a cubrir cada valor:
// si el schema gana una opción, el typecheck falla aquí.
export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export const ETIQUETA_ESTADO: Record<EstadoAlerta, string> = {
  abierta: 'Abierta',
  en_progreso: 'En progreso',
  cerrada: 'Cerrada',
  falso_positivo: 'Falso positivo',
};
