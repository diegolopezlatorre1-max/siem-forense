import { describe, expect, it, vi } from 'vitest';

import { crearSingleFlight } from './single-flight.js';

const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('crearSingleFlight', () => {
  it('ejecuta la operación una sola vez ante llamadas concurrentes y comparte el resultado', async () => {
    let contador = 0;
    const operacion = vi.fn(async () => {
      await dormir(10);
      return ++contador;
    });
    const refrescar = crearSingleFlight(operacion);

    const [a, b, c] = await Promise.all([refrescar(), refrescar(), refrescar()]);

    expect(operacion).toHaveBeenCalledTimes(1);
    expect([a, b, c]).toEqual([1, 1, 1]);
  });

  it('vuelve a ejecutar una vez que la anterior terminó', async () => {
    let contador = 0;
    const operacion = vi.fn(async () => ++contador);
    const refrescar = crearSingleFlight(operacion);

    expect(await refrescar()).toBe(1);
    expect(await refrescar()).toBe(2);
    expect(operacion).toHaveBeenCalledTimes(2);
  });

  it('libera el candado aunque la operación falle', async () => {
    let intentos = 0;
    const operacion = vi.fn(async () => {
      intentos++;
      if (intentos === 1) throw new Error('refresh falló');
      return intentos;
    });
    const refrescar = crearSingleFlight(operacion);

    await expect(refrescar()).rejects.toThrow('refresh falló');
    expect(await refrescar()).toBe(2);
  });
});
