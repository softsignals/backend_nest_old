# Legacy `src/` Status

La directory `src/` è legacy e mantenuta solo come riferimento storico.

## Regole

- Non usare `src/` come entrypoint runtime in produzione.
- Non aggiungere nuove feature in `src/`.
- CI/test/build ufficiali devono usare esclusivamente il percorso `apps/`.

## Entrypoint supportati

- `apps/api-gateway-bff`
- `apps/auth-service`
- `apps/timbrature-service`

## Nota

Eventuale rimozione definitiva di `src/` è pianificata fuori da P1 hardening.
