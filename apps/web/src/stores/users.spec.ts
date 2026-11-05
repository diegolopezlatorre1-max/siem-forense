import { setActivePinia, createPinia } from 'pinia';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUsersStore } from './users.js';

vi.mock('../api/users.api.js', () => ({
  listarUsuarios: vi.fn(async () => [
    { id: 1, usuario: 'admin', rol: 'admin' },
    { id: 2, usuario: 'ana', rol: 'analista' },
  ]),
  crearUsuario: vi.fn(),
}));

import { crearUsuario } from '../api/users.api.js';

// Error de Axios con un problem+json en el cuerpo, como lo devuelve el backend.
function errorHttp(status: number, title: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(title, 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: title,
    headers: {},
    config,
    data: { type: 'about:blank', title, status },
  });
}

describe('useUsersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('cargar normaliza la lista', async () => {
    const store = useUsersStore();
    await store.cargar();
    expect(store.status).toBe('success');
    expect(store.allIds).toEqual([1, 2]);
    expect(store.byId[2]?.usuario).toBe('ana');
  });

  it('crear agrega el usuario nuevo al final sin recargar', async () => {
    const store = useUsersStore();
    await store.cargar();
    vi.mocked(crearUsuario).mockResolvedValue({ id: 3, usuario: 'audi', rol: 'auditor' });

    const creado = await store.crear({ usuario: 'audi', clave: 'una-clave-larga', rol: 'auditor' });

    expect(creado?.id).toBe(3);
    expect(store.lista.map((u) => u.usuario)).toEqual(['admin', 'ana', 'audi']);
    expect(store.creando).toBe(false);
  });

  it('un usuario repetido deja el 409 en errorCrear y no toca la lista', async () => {
    const store = useUsersStore();
    await store.cargar();
    vi.mocked(crearUsuario).mockRejectedValue(errorHttp(409, 'Conflict'));

    const creado = await store.crear({ usuario: 'ana', clave: 'una-clave-larga', rol: 'analista' });

    expect(creado).toBeNull();
    expect(store.errorCrear?.status).toBe(409);
    expect(store.allIds).toEqual([1, 2]);
  });
});
