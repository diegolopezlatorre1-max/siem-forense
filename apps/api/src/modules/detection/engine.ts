import type { Regla, Severidad } from '@siem/shared';

// Puerto directo de app/detection/motor.py. Dominio puro: sin Nest ni TypeORM.

export interface EventoEvaluable {
  event_type: string;
  ts: Date;
  src_ip?: string | null;
  usuario?: string | null;
  host?: string | null;
}

export interface AlertaNueva {
  regla_id: string;
  nombre: string;
  severidad: Severidad;
  mitre: string;
  clave: string;
  cantidad: number;
  ts: Date;
}

export function evaluar(regla: Regla, eventos: readonly EventoEvaluable[]): AlertaNueva[] {
  const ventanaMs = regla.ventana_segundos * 1000;
  const grupos = new Map<string, EventoEvaluable[]>();
  for (const e of eventos) {
    if (e.event_type !== regla.event_type) continue;
    const clave = e[regla.agrupar_por];
    if (!clave) continue;
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(e);
    else grupos.set(clave, [e]);
  }

  const alertas: AlertaNueva[] = [];
  for (const [clave, lista] of grupos) {
    lista.sort((a, b) => a.ts.getTime() - b.ts.getTime());
    const activos: EventoEvaluable[] = [];
    for (const e of lista) {
      activos.push(e);
      // activos nunca queda vacío: e siempre está dentro de su propia ventana.
      while (e.ts.getTime() - activos[0]!.ts.getTime() > ventanaMs) activos.shift();
      if (activos.length >= regla.umbral) {
        alertas.push({
          regla_id: regla.id,
          nombre: regla.nombre,
          severidad: regla.severidad,
          mitre: regla.mitre,
          clave,
          cantidad: activos.length,
          ts: e.ts,
        });
        activos.length = 0;
      }
    }
  }
  return alertas;
}
