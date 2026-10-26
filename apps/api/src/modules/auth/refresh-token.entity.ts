import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Un refresh opaco por fila. La familia agrupa la cadena de rotaciones de una sesión.
@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  usuario_id: number;

  @Column({ type: 'uuid' })
  familia_id: string;

  @Column({ type: 'char', length: 64, unique: true })
  token_hash: string;

  @Column({ type: 'timestamptz' })
  expira_en: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usado_en: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revocado_en: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string | null;
}
