import { describe, expect, it } from 'vitest';

import { AccesoDenegadoError, ConflictoError, NoEncontradoError } from '../../common/errors/dominio.js';
import type { ClaimsAcceso } from '../auth/tokens.service.js';
import type { AlertaEntity } from './alerta.entity.js';
import type { AlertasRepository, CambiosAlerta } from './alertas.repository.js';
import { AlertasService } from './alertas.service.js';

const admin: ClaimsAcceso = { sub: 1, rol: 'admin', sid: 's' };
const ana: ClaimsAcceso = { sub: 2, rol: 'analista', sid: 's' };

function alertaBase(over: Partial<AlertaEntity> = {}): AlertaEntity {
  return {
    id: 10,
    regla_id: 'LINUX-001',
    nombre: 'Fuerza bruta SSH',
    severidad: 'high',
    mitre: 'T1110',
    clave: '192.168.56.103',
    cantidad: 5,
    ts: new Date('2026-10-20T00:00:00Z'),
    creada_en: new Date('2026-10-20T00:00:01Z'),
    estado: 'abierta',
    asignada_a: null,
    version: 1,
    ...over,
  };
}

// Repo falso: guarda una alerta y simula el bloqueo optimista por `version`.
function crear(alerta: AlertaEntity | null) {
  let actual = alerta;
  const repo: AlertasRepository = {
    listar: async () => [[], 0],
    existeDesde: async () => false,
    insertar: async () => true,
    buscarPorId: async (id) => (actual && actual.id === id ? actual : null),
    actualizarConVersion: async (id: number, version: number, cambios: CambiosAlerta) => {
      if (!actual || actual.id !== id || actual.version !== version) return null;
      actual = { ...actual, ...cambios, version: actual.version + 1 };
      return actual;
    },
  };
  return { repo, get: () => actual };
}

describe('AlertasService.cambiarEstado', () => {
  it('el admin cambia el estado e incrementa la versión', async () => {
    const { repo } = crear(alertaBase());
    const r = await new AlertasService(repo).cambiarEstado(10, admin, 'cerrada', 1);
    expect(r.estado).toBe('cerrada');
    expect(r.version).toBe(2);
  });

  it('409 si la versión no coincide (otra escritura ganó)', async () => {
    const { repo } = crear(alertaBase({ version: 3 }));
    await expect(new AlertasService(repo).cambiarEstado(10, admin, 'cerrada', 1)).rejects.toBeInstanceOf(ConflictoError);
  });

  it('403 si el analista no la tiene asignada', async () => {
    const { repo } = crear(alertaBase({ asignada_a: 99 }));
    await expect(new AlertasService(repo).cambiarEstado(10, ana, 'en_progreso', 1)).rejects.toBeInstanceOf(AccesoDenegadoError);
  });

  it('el analista cambia el estado si la alerta es suya', async () => {
    const { repo } = crear(alertaBase({ asignada_a: 2 }));
    const r = await new AlertasService(repo).cambiarEstado(10, ana, 'en_progreso', 1);
    expect(r.estado).toBe('en_progreso');
  });

  it('404 si la alerta no existe', async () => {
    const { repo } = crear(null);
    await expect(new AlertasService(repo).cambiarEstado(10, admin, 'cerrada', 1)).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('AlertasService.asignar', () => {
  it('el analista se la asigna a sí mismo', async () => {
    const { repo } = crear(alertaBase());
    const r = await new AlertasService(repo).asignar(10, ana, 2, 1);
    expect(r.asignada_a).toBe(2);
  });

  it('403 si el analista intenta asignarla a otro', async () => {
    const { repo } = crear(alertaBase());
    await expect(new AlertasService(repo).asignar(10, ana, 3, 1)).rejects.toBeInstanceOf(AccesoDenegadoError);
  });

  it('el admin la asigna a cualquiera', async () => {
    const { repo } = crear(alertaBase());
    const r = await new AlertasService(repo).asignar(10, admin, 3, 1);
    expect(r.asignada_a).toBe(3);
  });

  it('409 si la versión no coincide', async () => {
    const { repo } = crear(alertaBase({ version: 2 }));
    await expect(new AlertasService(repo).asignar(10, admin, 3, 1)).rejects.toBeInstanceOf(ConflictoError);
  });
});
