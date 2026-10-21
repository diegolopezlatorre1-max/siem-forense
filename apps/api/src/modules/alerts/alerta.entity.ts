import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Tabla heredada del backend Python (app/db.py).
@Entity('alertas')
@Unique('alertas_regla_id_clave_ts_key', ['regla_id', 'clave', 'ts'])
export class AlertaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  regla_id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 10 })
  severidad: string;

  @Column({ type: 'varchar', length: 20 })
  mitre: string;

  @Column({ type: 'varchar', length: 100 })
  clave: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'timestamptz' })
  ts: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  creada_en: Date;
}
