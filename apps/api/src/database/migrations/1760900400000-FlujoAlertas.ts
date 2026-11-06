import type { MigrationInterface, QueryRunner } from 'typeorm';

// S6: flujo de triage de alertas. `version` da el bloqueo optimista (@VersionColumn).
export class FlujoAlertas1760900400000 implements MigrationInterface {
  name = 'FlujoAlertas1760900400000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE alertas
        ADD COLUMN estado     VARCHAR(20) NOT NULL DEFAULT 'abierta',
        ADD COLUMN asignada_a INTEGER     REFERENCES usuarios (id) ON DELETE SET NULL,
        ADD COLUMN version     INTEGER     NOT NULL DEFAULT 1`);
    await q.query(`
      ALTER TABLE alertas
        ADD CONSTRAINT alertas_estado_chk
        CHECK (estado IN ('abierta', 'en_progreso', 'cerrada', 'falso_positivo'))`);
    await q.query(`CREATE INDEX ix_alertas_estado ON alertas (estado)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX ix_alertas_estado`);
    await q.query(`ALTER TABLE alertas DROP CONSTRAINT alertas_estado_chk`);
    await q.query(`ALTER TABLE alertas DROP COLUMN version`);
    await q.query(`ALTER TABLE alertas DROP COLUMN asignada_a`);
    await q.query(`ALTER TABLE alertas DROP COLUMN estado`);
  }
}
