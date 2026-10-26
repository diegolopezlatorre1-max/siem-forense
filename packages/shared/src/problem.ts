import { z } from 'zod';

// application/problem+json (RFC 7807), ver docs/05-backend.md.
export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  correlationId: z.string().optional(),
  errors: z.array(z.object({ ruta: z.string(), mensaje: z.string() })).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
