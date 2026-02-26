# SoftSignals Backend Microservices

Backend NestJS con percorso production in `apps/`:

- `api-gateway-bff` (porta `3000`): unico entrypoint pubblico (`/api/v1/*`).
- `auth-service` (porta `3001`): autenticazione JWT + refresh sessions.
- `timbrature-service` (porta `3002`): timbrature async + commesse + QR history.

Infrastruttura:
- Supabase PostgreSQL (esterno via `DATABASE_URL`)
- Redis (porta `6379`)

## Production Path (Importante)

- Il percorso runtime/CI supportato è **solo `apps/`**.
- `src/` è legacy e non deve essere usato per deploy o test CI.
- Dettagli: `docs/legacy-src.md`.

## Schema DB e Migrazioni

Lo schema è gestito da TypeORM migrations (baseline allineata a `docs/supabase-schema.sql`).

Comandi:

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate --name=<migration_name>
npm run db:prepare
npm run seed:mvp
```

`TypeORM synchronize` è disattivato (`false`) in auth/timbrature.
Per Supabase usare SSL con:

```env
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

## Bootstrap nuovo database Supabase

1. Imposta `DATABASE_URL` Supabase in `.env.auth` e `.env.timbrature`.
2. Esegui migrazioni:

```bash
npm run migration:run
```

3. Esegui seed MVP (1 admin, 1 manager, 1 dipendente, 2 commesse):

```bash
npm run seed:mvp
```

## Avvio locale con Docker

1. Prepara file env locali da `.env.example`:
   - `.env.gateway`
   - `.env.auth`
   - `.env.timbrature`
2. Verifica che `.env.auth` e `.env.timbrature` puntino a Supabase (`DATABASE_URL`).
3. Avvia stack:

```bash
docker compose up --build
```

3. Endpoint health:
   - Gateway live: `http://localhost:3000/api/v1/health/live`
   - Gateway ready: `http://localhost:3000/api/v1/health/ready`
   - Auth ready: `http://localhost:3001/health/ready`
   - Timbrature ready: `http://localhost:3002/health/ready`

## Avvio locale senza Docker

```bash
npm install
npm run start:dev:auth
npm run start:dev:timbrature
npm run start:dev:gateway
```

## Endpoint principali via gateway

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/permissions`
- `POST /api/v1/timbrature` (202 Accepted + `jobId`)
- `GET /api/v1/timbrature/jobs/:jobId`
- `GET /api/v1/timbrature`
- `POST /api/v1/commesse`
- `GET /api/v1/commesse`
- `GET /api/v1/commesse/:id`
- `PATCH /api/v1/commesse/:id`
- `POST /api/v1/commesse/:id/qr/regenerate`
- `GET /api/v1/commesse/:id/qr/history`

## Testing API (Bruno)

Per test manuali e **test bulk timbrature** con [Bruno](https://www.usebruno.com/): guida completa in **`docs/bruno-api-testing-guide.md`**.  
Il file `bruno.json` in root definisce lo scenario di load test (`timbrature-burst`); dalla root: `bru run --env local`.

## Secrets

Non committare secret o `.env.*` reali. Guida: `docs/secrets.md`.

## CI/CD e deploy produzione

Pipeline **`.github/workflows/deploy.yml`** (su push su `main`):

- Lavora in `backend_nest/`: `npm ci`, lint, test, migrazioni (Postgres in CI), build
- SonarQube su `apps` e `libs`
- Build immagine Docker unica (stesso image per gateway, auth, timbrature; il servizio è scelto da `NEST_APP`)
- Push su GitHub Container Registry come `ghcr.io/<repo>/backend-nest:latest`
- Deploy su VPS: in ` /opt/timbrio/backend_nest` viene scritto `docker-compose.prod.yml` e eseguito `docker compose up -d` (redis + auth + timbrature + gateway sulla porta **5000**)

**Sul server** devono esistere in `/opt/timbrio/backend_nest/` i file:

- `.env.gateway` (con `AUTH_SERVICE_URL=http://auth-service:3001`, `TIMBRATURE_SERVICE_URL=http://timbrature-service:3002` e le altre variabili del gateway)
- `.env.auth` (es. `DATABASE_URL`, `JWT_SECRET`, …)
- `.env.timbrature` (es. `DATABASE_URL`, `REDIS_HOST=timbrio-redis`, …)

Workflow aggiuntivo **`.github/workflows/ci-backend-nest.yml`**: CI (lint, test, build, migrazioni) su push/PR quando cambia `backend_nest/**`, senza deploy.
