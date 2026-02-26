# Progetto schema database Supabase da OpenAPI

Struttura tabelle PostgreSQL per Supabase, derivata dall’OpenAPI del Sistema Timbrature.

---

## 1. Enums (allineati agli schemi OpenAPI)

```sql
-- ValidityStatus (Timbratura / Turno)
CREATE TYPE validity_status AS ENUM (
  'OK',
  'AUTO_CORRECTED',
  'CONFLICT',
  'OVERLAP',
  'MISSING_OUT',
  'OFFLINE_INCONSISTENT'
);

-- AnomalyFlag (flag su timbratura/turno)
CREATE TYPE anomaly_flag AS ENUM (
  'DOUBLE_IN',
  'ORPHAN_OUT',
  'FORCED_CLOSE',
  'OVERLAP',
  'FUTURE_TIME',
  'PRE_EMPLOYMENT',
  'OFFLINE_REORDERED',
  'ROLE_VIOLATION',
  'MANUAL_OVERRIDE'
);

-- Ruolo utente
CREATE TYPE role_enum AS ENUM ('ADMIN', 'MANAGER', 'DIPENDENTE');

-- Origine timbratura
CREATE TYPE origine_enum AS ENUM ('ONLINE', 'OFFLINE', 'MANUALE', 'SISTEMA');

-- Tipo timbratura
CREATE TYPE tipo_timbratura_enum AS ENUM ('IN', 'OUT');

-- Tipo modifica (revisione)
CREATE TYPE modification_type_enum AS ENUM ('MANUAL', 'AUTO_CORRECTION');
```

---

## 2. Tabelle

### 2.1 Ruoli e utenti

```sql
-- Ruoli (opzionale se usi solo enum; utile per permessi espandibili)
CREATE TABLE roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       role_enum UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO roles (name) VALUES ('ADMIN'), ('MANAGER'), ('DIPENDENTE');

-- Utenti (anagrafica + auth se gestisci login in-house)
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice_dipendente  TEXT UNIQUE NOT NULL,
  nome               TEXT NOT NULL,
  cognome            TEXT NOT NULL,
  email              TEXT UNIQUE NOT NULL,
  password_hash      TEXT,
  ruolo              role_enum NOT NULL DEFAULT 'DIPENDENTE',
  reparto            TEXT,
  qualifica          TEXT,
  attivo             BOOLEAN NOT NULL DEFAULT true,
  data_assunzione    DATE NOT NULL,
  token_version      INT NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_by         UUID REFERENCES users(id),
  last_login_at      timestamptz,
  note               TEXT,
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_codice_dipendente ON users(codice_dipendente);
CREATE INDEX idx_users_ruolo ON users(ruolo);
CREATE INDEX idx_users_attivo ON users(attivo) WHERE attivo = true;

-- Storico cambi ruolo (OpenAPI: RoleHistory)
CREATE TABLE role_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_role   role_enum NOT NULL,
  new_role   role_enum NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason     TEXT,
  ip_address inet
);

CREATE INDEX idx_role_history_user_id ON role_history(user_id);
CREATE INDEX idx_role_history_changed_at ON role_history(changed_at DESC);
```

### 2.2 Sessioni di refresh (per auth con rotation)

```sql
CREATE TABLE refresh_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_id  TEXT NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_sessions_user_device ON refresh_sessions(user_id, device_id);
CREATE INDEX idx_refresh_sessions_expires ON refresh_sessions(expires_at) WHERE revoked_at IS NULL;
```

### 2.3 Commesse e QR

```sql
-- Commesse (OpenAPI: Commessa)
CREATE TABLE commesse (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT NOT NULL,
  descrizione      TEXT,
  codice_qr_attivo TEXT NOT NULL,
  attiva           BOOLEAN NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id)
);

CREATE INDEX idx_commesse_attiva ON commesse(attiva) WHERE attiva = true;

-- Storico rigenerazioni QR (OpenAPI: QRCodeRevision)
CREATE TABLE qr_code_revisions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id    UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  old_code       TEXT NOT NULL,
  new_code       TEXT NOT NULL,
  regenerated_by UUID NOT NULL REFERENCES users(id),
  regenerated_at timestamptz NOT NULL DEFAULT now(),
  reason         TEXT,
  ip_address     inet,
  success        BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_qr_code_revisions_commessa ON qr_code_revisions(commessa_id);
```

### 2.4 Timbrature e revisioni

```sql
-- Timbrature (OpenAPI: Timbratura)
CREATE TABLE timbrature (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  commessa_id       UUID NOT NULL REFERENCES commesse(id) ON DELETE RESTRICT,
  tipo              tipo_timbratura_enum NOT NULL,
  device_timestamp  timestamptz NOT NULL,
  server_timestamp  timestamptz NOT NULL DEFAULT now(),
  origine           origine_enum NOT NULL DEFAULT 'ONLINE',
  auto_generated    BOOLEAN NOT NULL DEFAULT false,
  validity_status   validity_status NOT NULL DEFAULT 'OK',
  anomaly_flags     anomaly_flag[] DEFAULT '{}',
  needs_review      BOOLEAN NOT NULL DEFAULT false,
  created_by        TEXT NOT NULL,
  soft_deleted      BOOLEAN NOT NULL DEFAULT false,
  idempotency_key   TEXT UNIQUE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_timbrature_user_ts ON timbrature(user_id, device_timestamp DESC);
CREATE INDEX idx_timbrature_commessa_ts ON timbrature(commessa_id, device_timestamp DESC);
CREATE INDEX idx_timbrature_server_ts ON timbrature(server_timestamp DESC);
CREATE INDEX idx_timbrature_soft_deleted ON timbrature(soft_deleted) WHERE soft_deleted = false;
CREATE INDEX idx_timbrature_idempotency ON timbrature(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Revisioni timbrature (OpenAPI: TimbraturaRevision)
CREATE TABLE timbrature_revisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timbratura_id     UUID NOT NULL REFERENCES timbrature(id) ON DELETE CASCADE,
  old_value         jsonb,
  new_value         jsonb,
  modified_by       TEXT NOT NULL,
  modification_type modification_type_enum NOT NULL,
  rule_applied      TEXT,
  reason            TEXT,
  timestamp         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_timbrature_revisions_timbratura ON timbrature_revisions(timbratura_id);
CREATE INDEX idx_timbrature_revisions_timestamp ON timbrature_revisions(timestamp DESC);
```

---

## 3. Vista “Turni” (derivata da coppie IN/OUT)

I turni nell’OpenAPI sono una vista logica su coppie IN/OUT consecutive (stesso utente, stessa commessa). In Supabase puoi esporli come vista SQL o come funzione che ritorna set.

```sql
-- Vista turni: coppie IN → OUT consecutive per (user_id, commessa_id)
-- Filtra soft_deleted e ordina per start_time
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
    EXTRACT(EPOCH FROM (o.device_timestamp - i.device_timestamp)) / 60 AS duration_minutes,
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
  duration_minutes::int AS duration_minutes,
  validity_status,
  anomaly_flags,
  source_timbrature
FROM pairs;
```

Per filtri (userId, commessaId, from, to) e `includeConflicts` si possono usare `WHERE` sulla vista o una funzione che accetta parametri e ritorna set.

---

## 4. RLS (Row Level Security) – linee guida

Supabase usa RLS per sicurezza lato DB. Esempi di policy (da adattare ai ruoli JWT):

- **users**: lettura per tutti gli autenticati; scrittura solo per `ruolo = 'ADMIN'` (e magari profilo proprio per alcuni campi).
- **commesse**: lettura per autenticati; insert/update solo ADMIN.
- **timbrature**: lettura per proprio `user_id` o per MANAGER/ADMIN; insert per proprio `user_id`; update/delete solo MANAGER/ADMIN (e non su se stessi se manager).
- **timbrature_revisions**, **role_history**, **qr_code_revisions**: lettura per ADMIN (e manager dove previsto); insert da backend/trigger.

Esempio abilitazione RLS e policy base:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE commesse ENABLE ROW LEVEL SECURITY;
ALTER TABLE timbrature ENABLE ROW LEVEL SECURITY;
-- ... altre tabelle

-- Esempio: utenti vedono solo se stessi (e admin tutti)
CREATE POLICY "users_select_own_or_admin"
  ON users FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT ruolo FROM users WHERE id = auth.uid()) = 'ADMIN'
  );
```

(Se usi Supabase Auth, `auth.uid()` è l’id in `auth.users`; se il backend usa un proprio JWT, potresti passare il ruolo in claim e usare una funzione custom tipo `current_user_role()` invece di leggere da `users`.)

---

## 5. Trigger `updated_at`

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER commesse_updated_at
  BEFORE UPDATE ON commesse
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER timbrature_updated_at
  BEFORE UPDATE ON timbrature
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
```

---

## 6. Mappatura OpenAPI → tabelle

| OpenAPI schema       | Tabella / tipo              | Note                                      |
|----------------------|-----------------------------|-------------------------------------------|
| Role                 | `role_enum`                 | Enum + opzionale tabella `roles`          |
| User                 | `users`                    | Anagrafica + auth (password_hash, token_version) |
| RoleHistory          | `role_history`             | Storico cambi ruolo                       |
| LoginRequest         | -                           | Solo payload; sessione in `refresh_sessions` |
| TokenPair / Refresh  | -                           | JWT + `refresh_sessions`                  |
| Commessa             | `commesse`                 | Codice QR attivo sulla commessa           |
| QRCodeRevision       | `qr_code_revisions`        | Storico rigenerazioni QR                  |
| Timbratura           | `timbrature`               | Con idempotency_key per async             |
| TimbraturaRevision   | `timbrature_revisions`     | old_value/new_value in jsonb              |
| ValidityStatus       | `validity_status`          | Enum                                      |
| AnomalyFlag          | `anomaly_flag`             | Enum; array su timbrature/turni           |
| Turno                | Vista `turni`              | Derivata da coppie IN/OUT                 |

---

## 7. Integrazione con i microservizi attuali

- **auth-service**: può puntare a Supabase (PostgreSQL) usando le tabelle `users`, `roles` (se usata), `refresh_sessions`. La connection string è quella del progetto Supabase (Settings → Database).
- **timbrature-service**: usa `timbrature`, `timbrature_revisions`, `commesse`; i turni sono letti dalla vista `turni` o da una funzione che applica filtri.
- **Supabase Auth (opzionale)**: se in futuro userai Supabase Auth, puoi tenere `auth.users` per login e una tabella `profiles` (o `users`) con `id UUID REFERENCES auth.users(id)` e i campi anagrafici/ruolo; in quel caso `refresh_sessions` può restare per il tuo flusso custom o essere sostituito da Supabase.

Se vuoi, il passo successivo può essere un unico file `.sql` eseguibile in Supabase SQL Editor (con ordine di creazione enums → tabelle → indici → vista → trigger → RLS).
