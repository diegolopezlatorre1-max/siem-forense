import type { MigrationInterface, QueryRunner } from 'typeorm';

// S4: usuarios y sesiones (refresh tokens con familia). gen_random_uuid() es nativo en PostgreSQL 16.
export class Usuarios1760900200000 implements MigrationInterface {
  name = 'Usuarios1760900200000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE usuarios (
        id         SERIAL PRIMARY KEY,
        usuario    VARCHAR(60)  NOT NULL UNIQUE,
        clave_hash VARCHAR(255) NOT NULL,
        rol        VARCHAR(20)  NOT NULL,
        activo     BOOLEAN      NOT NULL DEFAULT true,
        creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT usuarios_rol_chk CHECK (rol IN ('admin', 'analista', 'auditor'))
      )`);

    await q.query(`
      CREATE TABLE refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id  INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
        familia_id  UUID        NOT NULL,
        token_hash  CHAR(64)    NOT NULL UNIQUE,
        expira_en   TIMESTAMPTZ NOT NULL,
        usado_en    TIMESTAMPTZ,
        revocado_en TIMESTAMPTZ,
        ip          VARCHAR(45),
        user_agent  VARCHAR(255)
      )`);
    await q.query(`CREATE INDEX ix_refresh_familia ON refresh_tokens (familia_id)`);
    await q.query(`CREATE INDEX ix_refresh_usuario ON refresh_tokens (usuario_id)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE refresh_tokens`);
    await q.query(`DROP TABLE usuarios`);
  }
}
