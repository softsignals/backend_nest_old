# SoftSignals Backend Microservices

Backend NestJS con percorso production in `apps/`:

- `api-gateway-bff` (porta `3000`): unico entrypoint pubblico (`/api/v1/*`).
- `auth-service` (porta `3001`): autenticazione JWT + refresh sessions.
- `timbrature-service` (porta `3002`): timbrature async + commesse + QR history.

Infrastruttura:
- PostgreSQL (porta `5432`)
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
```

`TypeORM synchronize` è disattivato (`false`) in auth/timbrature.

## Avvio locale con Docker

1. Prepara file env locali da `.env.example`:
   - `.env.gateway`
   - `.env.auth`
   - `.env.timbrature`
2. Avvia stack:

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

## Secrets

Non committare secret o `.env.*` reali. Guida: `docs/secrets.md`.

## CI

Pipeline `.github/workflows/ci.yml`:

- `npm ci`
- `npm run lint`
- `npm run migration:run`
- `npm run test`
- `npm run build`
