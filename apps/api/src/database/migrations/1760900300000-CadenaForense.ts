import type { MigrationInterface, QueryRunner } from 'typeorm';

// S4: cadena forense HMAC. El eslabón génesis (secuencia 0) es implícito: su hash es
// HMAC(CLAVE_FORENSE, "GENESIS|siem-forense"), que el servicio calcula en tiempo de ejecución
// (no se guarda la clave en una migración). El primer eslabón real es la secuencia 1.
export class CadenaForense1760900300000 implements MigrationInterface {
  name = 'CadenaForense1760900300000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE cadena_forense (
        secuencia     INTEGER     PRIMARY KEY,
        evento_id     INTEGER     NOT NULL UNIQUE REFERENCES eventos (id),
        hash_anterior CHAR(64)    NOT NULL,
        hash          CHAR(64)    NOT NULL,
        sellado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE cadena_forense`);
  }
}
