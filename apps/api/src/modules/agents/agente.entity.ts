import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('agentes')
export class AgenteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  host: string | null;

  @Column({ type: 'char', length: 8, unique: true })
  prefijo_llave: string;

  @Column({ type: 'varchar', length: 255 })
  llave_hash: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  creado_en: Date;
}
