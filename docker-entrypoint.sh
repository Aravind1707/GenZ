#!/bin/sh
set -eu

if [ "${GENZ_RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running GenZ database migrations..."
  npm run db:migrate
fi

echo "Starting GenZ OS on 0.0.0.0:3000"
exec npm start -- -H 0.0.0.0 -p "${PORT:-3000}"
