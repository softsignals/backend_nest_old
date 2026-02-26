import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupabaseAlignment00011708780900000 implements MigrationInterface {
  name = 'SupabaseAlignment00011708780900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE validity_status AS ENUM (
        'OK', 'AUTO_CORRECTED', 'CONFLICT', 'OVERLAP',
        'MISSING_OUT', 'OFFLINE_INCONSISTENT'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE anomaly_flag AS ENUM (
        'DOUBLE_IN', 'ORPHAN_OUT', 'FORCED_CLOSE', 'OVERLAP',
        'FUTURE_TIME', 'PRE_EMPLOYMENT', 'OFFLINE_REORDERED',
        'ROLE_VIOLATION', 'MANUAL_OVERRIDE'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE role_enum AS ENUM ('ADMIN', 'MANAGER', 'DIPENDENTE');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE origine_enum AS ENUM ('ONLINE', 'OFFLINE', 'MANUALE', 'SISTEMA');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE tipo_timbratura_enum AS ENUM ('IN', 'OUT');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE modification_type_enum AS ENUM ('MANUAL', 'AUTO_CORRECTION');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name role_enum UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO roles (name) VALUES ('ADMIN'), ('MANAGER'), ('DIPENDENTE')
      ON CONFLICT (name) DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codice_dipendente TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        ruolo role_enum NOT NULL DEFAULT 'DIPENDENTE',
        reparto TEXT,
        qualifica TEXT,
        attivo BOOLEAN NOT NULL DEFAULT true,
        data_assunzione DATE NOT NULL,
        token_version INT NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by UUID REFERENCES users(id),
        last_login_at timestamptz,
        note TEXT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_codice_dipendente ON users(codice_dipendente)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_ruolo ON users(ruolo)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_attivo ON users(attivo) WHERE attivo = true`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_role role_enum NOT NULL,
        new_role role_enum NOT NULL,
        changed_by UUID NOT NULL REFERENCES users(id),
        changed_at timestamptz NOT NULL DEFAULT now(),
        reason TEXT,
        ip_address inet
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_role_history_user_id ON role_history(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_role_history_changed_at ON role_history(changed_at DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        device_id TEXT NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_device ON refresh_sessions(user_id, device_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires ON refresh_sessions(expires_at) WHERE revoked_at IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS commesse (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        descrizione TEXT,
        codice_qr_attivo TEXT NOT NULL,
        attiva BOOLEAN NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by UUID REFERENCES users(id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_commesse_attiva ON commesse(attiva) WHERE attiva = true`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qr_code_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
        old_code TEXT NOT NULL,
        new_code TEXT NOT NULL,
        regenerated_by UUID NOT NULL REFERENCES users(id),
        regenerated_at timestamptz NOT NULL DEFAULT now(),
        reason TEXT,
        ip_address inet,
        success BOOLEAN NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_qr_code_revisions_commessa ON qr_code_revisions(commessa_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS timbrature (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE RESTRICT,
        tipo tipo_timbratura_enum NOT NULL,
        device_timestamp timestamptz NOT NULL,
        server_timestamp timestamptz NOT NULL DEFAULT now(),
        origine origine_enum NOT NULL DEFAULT 'ONLINE',
        auto_generated BOOLEAN NOT NULL DEFAULT false,
        validity_status validity_status NOT NULL DEFAULT 'OK',
        anomaly_flags anomaly_flag[] DEFAULT '{}',
        needs_review BOOLEAN NOT NULL DEFAULT false,
        created_by TEXT NOT NULL,
        soft_deleted BOOLEAN NOT NULL DEFAULT false,
        idempotency_key TEXT UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_timbrature_user_ts ON timbrature(user_id, device_timestamp DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_timbrature_commessa_ts ON timbrature(commessa_id, device_timestamp DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_timbrature_server_ts ON timbrature(server_timestamp DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_timbrature_soft_deleted ON timbrature(soft_deleted) WHERE soft_deleted = false`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_timbrature_idempotency ON timbrature(idempotency_key) WHERE idempotency_key IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS timbrature_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timbratura_id UUID NOT NULL REFERENCES timbrature(id) ON DELETE CASCADE,
        old_value jsonb,
        new_value jsonb,
        modified_by TEXT NOT NULL,
        modification_type modification_type_enum NOT NULL,
        rule_applied TEXT,
        reason TEXT,
        timestamp timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_timbrature_revisions_timbratura ON timbrature_revisions(timbratura_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_timbrature_revisions_timestamp ON timbrature_revisions(timestamp DESC)`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE VIEW turni AS
      WITH ordered AS (
        SELECT
          id,
          user_id,
          commessa_id,
          tipo,
          device_timestamp,
          validity_status,
          anomaly_flags,
          ROW_NUMBER() OVER (
            PARTITION BY user_id, commessa_id
            ORDER BY device_timestamp
          ) AS rn
        FROM timbrature
        WHERE soft_deleted = false
      ),
      pairs AS (
        SELECT
          i.user_id,
          i.commessa_id,
          i.device_timestamp AS start_time,
          o.device_timestamp AS end_time,
          (EXTRACT(EPOCH FROM (o.device_timestamp - i.device_timestamp)) / 60)::int AS duration_minutes,
          COALESCE(o.validity_status, i.validity_status) AS validity_status,
          COALESCE(o.anomaly_flags, i.anomaly_flags) AS anomaly_flags,
          ARRAY[i.id, o.id] AS source_timbrature
        FROM ordered i
        JOIN ordered o
          ON i.user_id = o.user_id
         AND i.commessa_id = o.commessa_id
         AND i.tipo = 'IN'
         AND o.tipo = 'OUT'
         AND i.rn + 1 = o.rn
      )
      SELECT
        gen_random_uuid() AS id,
        user_id,
        commessa_id,
        start_time,
        end_time,
        duration_minutes,
        validity_status,
        anomaly_flags,
        source_timbrature
      FROM pairs
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS users_updated_at ON users`);
    await queryRunner.query(`
      CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS commesse_updated_at ON commesse`,
    );
    await queryRunner.query(`
      CREATE TRIGGER commesse_updated_at
      BEFORE UPDATE ON commesse
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS timbrature_updated_at ON timbrature`,
    );
    await queryRunner.query(`
      CREATE TRIGGER timbrature_updated_at
      BEFORE UPDATE ON timbrature
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS turni`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS timbrature_updated_at ON timbrature`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS commesse_updated_at ON commesse`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS users_updated_at ON users`);

    await queryRunner.query(`DROP TABLE IF EXISTS timbrature_revisions`);
    await queryRunner.query(`DROP TABLE IF EXISTS timbrature`);
    await queryRunner.query(`DROP TABLE IF EXISTS qr_code_revisions`);
    await queryRunner.query(`DROP TABLE IF EXISTS commesse`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_history`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);

    await queryRunner.query(`DROP TYPE IF EXISTS modification_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS tipo_timbratura_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS origine_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS role_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS anomaly_flag`);
    await queryRunner.query(`DROP TYPE IF EXISTS validity_status`);
  }
}
