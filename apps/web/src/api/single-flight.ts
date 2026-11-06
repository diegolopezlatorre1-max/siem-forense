// Garantiza que, lleguen las llamadas que lleguen mientras una operación está en
// vuelo, la operación se ejecute UNA sola vez; el resto comparte ese mismo resultado.
// Lo usa el interceptor de http.ts para que N peticiones con 401 disparen un solo
// POST /auth/refresh y esperen todas en cola (F3 de docs/06-frontend.md).
export function crearSingleFlight<T>(operacion: () => Promise<T>): () => Promise<T> {
  let enVuelo: Promise<T> | null = null;
  return () => {
    if (enVuelo) return enVuelo;
    enVuelo = operacion().finally(() => {
      enVuelo = null;
    });
    return enVuelo;
  };
}
