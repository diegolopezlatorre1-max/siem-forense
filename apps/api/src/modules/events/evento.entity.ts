import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Tabla heredada del backend Python (app/db.py): mismos nombres de columnas.
@Entity('eventos')
export class EventoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  event_id: string;

  @Column({ type: 'timestamptz' })
  ts: Date;

  @Column({ type: 'varchar', length: 120 })
  host: string;

  @Column({ type: 'varchar', length: 60 })
  source: string;

  @Column({ type: 'varchar', length: 60 })
  event_type: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  usuario: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  src_ip: string | null;

  @Column({ type: 'varchar', length: 20, default: 'low' })
  severity: string;

  @Column({ type: 'text' })
  raw: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  recibido_en: Date;

  @Column({ type: 'int', nullable: true })
  agente_id: number | null;
}
