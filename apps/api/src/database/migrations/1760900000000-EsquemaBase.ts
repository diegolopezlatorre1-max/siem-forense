import type { MigrationInterface, QueryRunner } from 'typeorm';

// Compatible con las tablas que creó create_all() en el backend Python:
// si ya existen se conservan (con sus datos) y solo se completan.
export class EsquemaBase1760900000000 implements MigrationInterface {
  name = 'EsquemaBase1760900000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS eventos (
        id          SERIAL PRIMARY KEY,
        event_id    VARCHAR(64)  NOT NULL,
        ts          TIMESTAMPTZ  NOT NULL,
        host        VARCHAR(120) NOT NULL,
        source      VARCHAR(60)  NOT NULL,
        event_type  VARCHAR(60)  NOT NULL,
        usuario     VARCHAR(120),
        src_ip      VARCHAR(45),
        severity    VARCHAR(20)  NOT NULL,
        raw         TEXT         NOT NULL,
        recibido_en TIMESTAMPTZ  NOT NULL
      )`);
    await q.query(`ALTER TABLE eventos ALTER COLUMN event_id TYPE VARCHAR(64)`);
    await q.query(`ALTER TABLE eventos ALTER COLUMN severity SET DEFAULT 'low'`);
    await q.query(`ALTER TABLE eventos ALTER COLUMN recibido_en SET DEFAULT now()`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS ix_eventos_event_id ON eventos (event_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS ix_eventos_tipo_ts ON eventos (event_type, ts)`);
    await q.query(`CREATE INDEX IF NOT EXISTS ix_eventos_ip_ts ON eventos (src_ip, ts)`);
    await q.query(`CREATE INDEX IF NOT EXISTS ix_eventos_usuario_ts ON eventos (usuario, ts)`);
    await q.query(`CREATE INDEX IF NOT EXISTS ix_eventos_host_ts ON eventos (host, ts)`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS alertas (
        id        SERIAL PRIMARY KEY,
        regla_id  VARCHAR(30)  NOT NULL,
        nombre    VARCHAR(100) NOT NULL,
        severidad VARCHAR(10)  NOT NULL,
        mitre     VARCHAR(20)  NOT NULL,
        clave     VARCHAR(100) NOT NULL,
        cantidad  INTEGER      NOT NULL,
        ts        TIMESTAMPTZ  NOT NULL,
        creada_en TIMESTAMPTZ  NOT NULL,
        CONSTRAINT alertas_regla_id_clave_ts_key UNIQUE (regla_id, clave, ts)
      )`);
    await q.query(`ALTER TABLE alertas ALTER COLUMN creada_en SET DEFAULT now()`);
    await q.query(`CREATE INDEX IF NOT EXISTS ix_alertas_regla_id ON alertas (regla_id)`);
  }

  // No se borran las tablas: pueden traer datos del laboratorio anteriores a TypeORM.
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP INDEX IF EXISTS ix_eventos_tipo_ts, ix_eventos_ip_ts, ix_eventos_usuario_ts, ix_eventos_host_ts`,
    );
  }
}
