import { z } from 'zod';

export const paginado = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    pagina: z.number().int(),
    tamano: z.number().int(),
  });

export interface Paginado<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}
