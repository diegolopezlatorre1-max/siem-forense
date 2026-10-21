import type { MigrationInterface, QueryRunner } from 'typeorm';

// Parte de la seguridad que necesita la ingesta (S3). Usuarios y refresh_tokens llegan en S4.
export class Agentes1760900100000 implements MigrationInterface {
  name = 'Agentes1760900100000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE agentes (
        id            SERIAL PRIMARY KEY,
        nombre        VARCHAR(60)  NOT NULL UNIQUE,
        host          VARCHAR(120),
        prefijo_llave CHAR(8)      NOT NULL UNIQUE,
        llave_hash    VARCHAR(255) NOT NULL,
        activo        BOOLEAN      NOT NULL DEFAULT true,
        creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now()
      )`);
    await q.query(`ALTER TABLE eventos ADD COLUMN agente_id INTEGER REFERENCES agentes (id)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE eventos DROP COLUMN agente_id`);
    await q.query(`DROP TABLE agentes`);
  }
}
