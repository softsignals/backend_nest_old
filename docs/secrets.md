# Secrets e Configurazione Produzione

## Principi

- Nessun secret reale nel repository.
- I file `.env.auth`, `.env.gateway`, `.env.timbrature` sono locali e ignorati da git.
- Usare secret manager della piattaforma (Supabase, Vercel, Kubernetes Secrets, ECS/SSM).

## Variabili richieste

### Shared / DB

- `DATABASE_URL`: connessione PostgreSQL/Supabase.
- `DATABASE_SSL`: `true` per Supabase.
- `DATABASE_SSL_REJECT_UNAUTHORIZED`: tipicamente `false` con pooler Supabase locale/dev.

### Gateway

- `PORT`
- `GATEWAY_CORS_ORIGINS`
- `AUTH_SERVICE_URL`
- `TIMBRATURE_SERVICE_URL`

### Auth Service

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ACCESS_TTL_SECONDS`
- `JWT_REFRESH_TTL_DAYS`
- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `AUTH_ADMIN_CODICE_DIPENDENTE`
- `AUTH_ADMIN_NOME`
- `AUTH_ADMIN_COGNOME`
- `AUTH_ADMIN_DATA_ASSUNZIONE`

### Timbrature Service

- `PORT`
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `COMMESSE_QR_REGEN_PASSWORD`

## Deploy

1. Caricare i secret nel provider.
2. Eseguire `npm run migration:run` in fase deploy prima del traffico.
3. Avviare servizi con env iniettate dalla piattaforma.
