import { setActivePinia, createPinia } from 'pinia';
import type { Alerta } from '@siem/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAlertsStore } from './alerts.js';

vi.mock('../api/alerts.api.js', () => ({
  listarAlertas: vi.fn(async () => ({ items: [], total: 0, pagina: 1, tamano: 50 })),
  asignarAlerta: vi.fn(),
  cambiarEstadoAlerta: vi.fn(),
}));

import { asignarAlerta, cambiarEstadoAlerta, listarAlertas } from '../api/alerts.api.js';

const alerta = (over: Partial<Alerta> = {}): Alerta => ({
  id: 1,
  regla_id: 'LINUX-001',
  nombre: 'Fuerza bruta SSH',
  severidad: 'high',
  mitre: 'T1110',
  clave: '192.168.56.103',
  cantidad: 5,
  ts: '2026-10-20T00:00:00.000Z',
  creada_en: '2026-10-20T00:00:01.000Z',
  estado: 'abierta',
  asignada_a: null,
  version: 1,
  ...over,
});

function conAlerta(a: Alerta) {
  const store = useAlertsStore();
  store.byId = { [a.id]: a };
  store.allIds = [a.id];
  return store;
}

describe('useAlertsStore acciones', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('asignarme reemplaza la alerta con la versión que devuelve el backend', async () => {
    const store = conAlerta(alerta());
    vi.mocked(asignarAlerta).mockResolvedValue(alerta({ asignada_a: 2, version: 2 }));

    const ok = await store.asignarme(1, 2);

    expect(ok).toBe(true);
    expect(asignarAlerta).toHaveBeenCalledWith(1, 2, 1); // manda la version vigente
    expect(store.byId[1]?.asignada_a).toBe(2);
    expect(store.byId[1]?.version).toBe(2);
    expect(listarAlertas).not.toHaveBeenCalled();
  });

  it('cambiarEstado reemplaza el estado y no recarga si sale bien', async () => {
    const store = conAlerta(alerta({ asignada_a: 2 }));
    vi.mocked(cambiarEstadoAlerta).mockResolvedValue(alerta({ asignada_a: 2, estado: 'cerrada', version: 2 }));

    const ok = await store.cambiarEstado(1, 'cerrada');

    expect(ok).toBe(true);
    expect(cambiarEstadoAlerta).toHaveBeenCalledWith(1, 'cerrada', 1);
    expect(store.byId[1]?.estado).toBe('cerrada');
  });

  it('ante un error devuelve false y recarga la página para refrescar versiones', async () => {
    const store = conAlerta(alerta({ asignada_a: 2 }));
    vi.mocked(cambiarEstadoAlerta).mockRejectedValue(new Error('409'));

    const ok = await store.cambiarEstado(1, 'cerrada');

    expect(ok).toBe(false);
    expect(listarAlertas).toHaveBeenCalledTimes(1);
  });

  it('no hace nada si la alerta no está en el store', async () => {
    const store = useAlertsStore();
    const ok = await store.asignarme(99, 2);
    expect(ok).toBe(false);
    expect(asignarAlerta).not.toHaveBeenCalled();
  });
});
