import type { Alerta, EstadoAlerta, Severidad } from '@siem/shared';

// Agrupa en el frontend las alertas que pertenecen a un mismo ataque: misma
// `clave` (IP, host o usuario según la regla) y separadas entre sí por menos de
// `huecoMs`. Un solo ataque suele disparar varias reglas (LINUX-001 y LINUX-002)
// y repetir la misma regla tras cada ventana; así se ven como un único grupo.

export const HUECO_ATAQUE_MS = 30 * 60_000;

const ORDEN_SEVERIDAD: Record<Severidad, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export interface GrupoAlertas {
  /** Estable mientras entran alertas más recientes: clave + id de la alerta más antigua. */
  id: string;
  clave: string;
  /** Alertas del grupo, la más reciente primero. */
  alertas: Alerta[];
  /** Reglas distintas que se dispararon, en orden de aparición. */
  reglas: string[];
  severidad: Severidad;
  desde: string;
  hasta: string;
  cantidadTotal: number;
  /** Estado común de todas las alertas, o null si es mixto. */
  estado: EstadoAlerta | null;
}

const tiempo = (a: Alerta): number => new Date(a.ts).getTime();

function construir(clave: string, ascendentes: Alerta[]): GrupoAlertas {
  const primera = ascendentes[0]!;
  const ultima = ascendentes[ascendentes.length - 1]!;
  let severidad: Severidad = primera.severidad;
  let cantidadTotal = 0;
  const reglas: string[] = [];
  for (const a of ascendentes) {
    if (ORDEN_SEVERIDAD[a.severidad] > ORDEN_SEVERIDAD[severidad]) severidad = a.severidad;
    cantidadTotal += a.cantidad;
    if (!reglas.includes(a.regla_id)) reglas.push(a.regla_id);
  }
  const estado = ascendentes.every((a) => a.estado === primera.estado) ? primera.estado : null;
  return {
    id: `${clave}#${primera.id}`,
    clave,
    alertas: [...ascendentes].reverse(),
    reglas,
    severidad,
    desde: primera.ts,
    hasta: ultima.ts,
    cantidadTotal,
    estado,
  };
}

export function agruparAlertas(alertas: readonly Alerta[], huecoMs = HUECO_ATAQUE_MS): GrupoAlertas[] {
  const porClave = new Map<string, Alerta[]>();
  for (const a of alertas) {
    const lista = porClave.get(a.clave);
    if (lista) lista.push(a);
    else porClave.set(a.clave, [a]);
  }

  const grupos: GrupoAlertas[] = [];
  for (const [clave, lista] of porClave) {
    lista.sort((x, y) => tiempo(x) - tiempo(y) || x.id - y.id);
    let actual: Alerta[] = [];
    for (const a of lista) {
      const anterior = actual[actual.length - 1];
      if (anterior !== undefined && tiempo(a) - tiempo(anterior) > huecoMs) {
        grupos.push(construir(clave, actual));
        actual = [];
      }
      actual.push(a);
    }
    if (actual.length > 0) grupos.push(construir(clave, actual));
  }

  // El ataque más reciente primero, como la lista de alertas.
  return grupos.sort((x, y) => new Date(y.hasta).getTime() - new Date(x.hasta).getTime());
}
