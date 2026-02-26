import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoginAttempts00021708843500000 implements MigrationInterface {
  name = 'LoginAttempts00021708843500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scope VARCHAR NOT NULL,
        identifier VARCHAR NOT NULL,
        failed_count INT NOT NULL DEFAULT 0,
        locked_until timestamptz,
        last_failed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_login_attempts_scope_identifier UNIQUE (scope, identifier)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_locked_until ON login_attempts(locked_until)
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS login_attempts_updated_at ON login_attempts`);
    await queryRunner.query(`
      CREATE TRIGGER login_attempts_updated_at
      BEFORE UPDATE ON login_attempts
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS login_attempts_updated_at ON login_attempts`);
    await queryRunner.query(`DROP TABLE IF EXISTS login_attempts`);
  }
}
