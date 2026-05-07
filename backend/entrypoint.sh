#!/bin/sh
# entrypoint.sh
set -e

echo "Waiting for Postgres..."
while ! pg_isready -h "$DB_HOST" -U "$POSTGRES_USER" >/dev/null 2>&1; do
  sleep 1
done

echo "Running migrations..."
alembic upgrade head

echo "Starting FastAPI..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000