import { Column, Entity, PrimaryColumn } from 'typeorm';

// Un eslabón por evento sellado. secuencia se asigna bajo bloqueo en la ingesta (no es serial).
@Entity('cadena_forense')
export class EslabonEntity {
  @PrimaryColumn({ type: 'int' })
  secuencia: number;

  @Column({ type: 'int', unique: true })
  evento_id: number;

  @Column({ type: 'char', length: 64 })
  hash_anterior: string;

  @Column({ type: 'char', length: 64 })
  hash: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  sellado_en: Date;
}
