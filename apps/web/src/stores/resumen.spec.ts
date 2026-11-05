import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FiltrosAlertas } from '../api/alerts.api.js';
import { useResumenStore } from './resumen.js';

// Totales simulados por filtro: abiertas por severidad y en progreso.
const TOTALES: Record<string, number> = {
  'abierta/low': 4,
  'abierta/medium': 2,
  'abierta/high': 7,
  'abierta/critical': 1,
  'en_progreso/': 3,
};

vi.mock('../api/alerts.api.js', () => ({
  listarAlertas: vi.fn(async (f: FiltrosAlertas) => ({
    items: [],
    total: TOTALES[`${f.estado}/${f.severidad}`] ?? 0,
    pagina: 1,
    tamano: 1,
  })),
}));

import { listarAlertas } from '../api/alerts.api.js';

describe('useResumenStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(listarAlertas).mockClear();
  });

  it('cuenta las abiertas por severidad y las en progreso', async () => {
    const store = useResumenStore();
    await store.cargar();

    expect(store.status).toBe('success');
    expect(store.abiertas).toEqual({ low: 4, medium: 2, high: 7, critical: 1 });
    expect(store.totalAbiertas).toBe(14);
    expect(store.enProgreso).toBe(3);
    // Una consulta por severidad más la de en progreso, todas de tamaño 1.
    expect(listarAlertas).toHaveBeenCalledTimes(5);
    for (const llamada of vi.mocked(listarAlertas).mock.calls) expect(llamada[2]).toBe(1);
  });

  it('usa la caché de 30 s salvo que se fuerce', async () => {
    const store = useResumenStore();
    await store.cargar();
    await store.cargar();
    expect(listarAlertas).toHaveBeenCalledTimes(5);
    await store.cargar(true);
    expect(listarAlertas).toHaveBeenCalledTimes(10);
  });

  it('guarda el error si falla alguna consulta', async () => {
    vi.mocked(listarAlertas).mockRejectedValueOnce(new Error('red caída'));
    const store = useResumenStore();
    await store.cargar();
    expect(store.status).toBe('error');
    expect(store.totalAbiertas).toBe(0);
  });
});
