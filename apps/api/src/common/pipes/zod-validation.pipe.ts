import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

// El ZodError lo convierte AllExceptionsFilter en un 400 con errors[].
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(valor: unknown): z.infer<T> {
    return this.schema.parse(valor);
  }
}
