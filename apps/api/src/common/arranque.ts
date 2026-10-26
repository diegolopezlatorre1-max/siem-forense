// Con bufferLogs, Nest no muestra los errores de arranque y el proceso queda colgado:
// se imprimen aquí y se sale con código 1 (p. ej. .env incompleto o PostgreSQL caído).
export async function oSalir<T>(crear: () => Promise<T>): Promise<T> {
  try {
    return await crear();
  } catch (e) {
    const causas = e instanceof AggregateError ? e.errors : [e];
    console.error('No se pudo arrancar:', causas.map((c) => (c instanceof Error ? c.message : String(c))).join('; '));
    process.exit(1);
  }
}
