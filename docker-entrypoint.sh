#!/bin/sh
set -e
case "${NEST_APP}" in
  api-gateway-bff) exec node dist/apps/api-gateway-bff/apps/api-gateway-bff/src/main.js ;;
  auth-service) exec node dist/apps/auth-service/apps/auth-service/src/main.js ;;
  timbrature-service) exec node dist/apps/timbrature-service/apps/timbrature-service/src/main.js ;;
  *)
    echo "Unknown or missing NEST_APP: ${NEST_APP}. Set NEST_APP to api-gateway-bff, auth-service, or timbrature-service."
    exit 1
    ;;
esac
