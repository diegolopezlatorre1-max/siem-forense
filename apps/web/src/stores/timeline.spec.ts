import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aLocal, useTimelineStore } from './timeline.js';

vi.mock('../api/timeline.api.js', () => ({
  consultarLineaTiempo: vi.fn(async () => ({ items: [], truncada: false })),
}));

import { consultarLineaTiempo } from '../api/timeline.api.js';

describe('useTimelineStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('no consulta sin host, usuario ni IP', async () => {
    const store = useTimelineStore();
    await store.cargar();
    expect(consultarLineaTiempo).not.toHaveBeenCalled();
    expect(store.status).toBe('idle');
  });

  it('guarda los elementos y cuenta las alertas', async () => {
    vi.mocked(consultarLineaTiempo).mockResolvedValue({
      items: [
        {
          tipo: 'alerta',
          ts: '2026-10-30T16:45:00.000Z',
          alerta: {
            id: 9,
            regla_id: 'WIN-001',
            nombre: 'Fuerza bruta en Windows',
            severidad: 'high',
            mitre: 'T1110',
            clave: '192.168.56.103',
            cantidad: 5,
            ts: '2026-10-30T16:45:00.000Z',
            creada_en: '2026-10-30T16:45:01.000Z',
            estado: 'abierta',
            asignada_a: null,
            version: 1,
          },
        },
      ],
      truncada: true,
    });
    const store = useTimelineStore();
    store.filtros.src_ip = '192.168.56.103';

    await store.cargar();

    expect(consultarLineaTiempo).toHaveBeenCalledTimes(1);
    expect(store.status).toBe('success');
    expect(store.totalAlertas).toBe(1);
    expect(store.truncada).toBe(true);
  });

  it('el rango por defecto son las últimas 24 horas', () => {
    const store = useTimelineStore();
    const horas = (Date.parse(store.filtros.hasta) - Date.parse(store.filtros.desde)) / 3600_000;
    expect(horas).toBe(24);
  });

  it('aLocal da el formato de datetime-local', () => {
    expect(aLocal(new Date(2026, 9, 30, 9, 5))).toBe('2026-10-30T09:05');
  });
});
