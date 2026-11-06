import type { Alerta, ElementoLineaTiempo, Evento } from '@siem/shared';

// Dominio puro: mezcla eventos y alertas en orden cronológico ascendente.
// A igual `ts`, el evento va antes que la alerta (la alerta lleva el ts de su último evento).
export function mezclar(eventos: readonly Evento[], alertas: readonly Alerta[]): ElementoLineaTiempo[] {
  const elementos: ElementoLineaTiempo[] = [
    ...eventos.map((evento): ElementoLineaTiempo => ({ tipo: 'evento', ts: evento.ts, evento })),
    ...alertas.map((alerta): ElementoLineaTiempo => ({ tipo: 'alerta', ts: alerta.ts, alerta })),
  ];
  const orden = (e: ElementoLineaTiempo): number => (e.tipo === 'evento' ? 0 : 1);
  return elementos.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts) || orden(a) - orden(b));
}
