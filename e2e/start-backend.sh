#!/usr/bin/env bash
# Start the API for the browser suite on a THROWAWAY copy of a database.
#
# The suite clicks every button it can find, including ones that change data,
# so it must never point at a database anyone cares about. Each run clones the
# source database (APFS clone, instant) into e2e/.tmp and works on that.
# Email is held for every address and Sentry is off, so a run can't mail a
# writer or report noise.
#
#   E2E_BACKEND_DIR  backend checkout   (default: ../verax_backend next to this repo)
#   E2E_SOURCE_DB    sqlite to copy     (default: $E2E_BACKEND_DIR/verax_livetest.db)
#   E2E_API_PORT     port               (default: 8100)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="${E2E_BACKEND_DIR:-$(cd "$HERE/../.." && pwd)/verax_backend}"
SOURCE_DB="${E2E_SOURCE_DB:-$BACKEND_DIR/verax_livetest.db}"
PORT="${E2E_API_PORT:-8100}"
WEB_PORT="${E2E_WEB_PORT:-3100}"
TMP="$HERE/.tmp"
DB="$TMP/e2e.db"

mkdir -p "$TMP"
rm -f "$DB" "$DB-wal" "$DB-shm"
cp -c "$SOURCE_DB" "$DB" 2>/dev/null || cp "$SOURCE_DB" "$DB"

cd "$BACKEND_DIR"
export ENVIRONMENT=DEVELOPMENT
export SQLALCHEMY_DATABASE_URL="sqlite:///$DB"
export ADMIN_EMAILS="e2e-admin@example.com"
export ADMIN_SIGNUP_CODE="e2e-admin-code"
export EXTRA_CORS_ORIGINS="http://localhost:$WEB_PORT"
export EMAIL_ALLOWLIST="e2e-blackhole@example.invalid"
export EMAIL_API_KEY="e2e-no-send"
export SENTRY_DSN=""
export INGEST_WORKER_IN_PROCESS=0
"$BACKEND_DIR/venv/bin/python" "$HERE/seed_invites.py" "$BACKEND_DIR" "$TMP/invites.json"
exec "$BACKEND_DIR/venv/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port "$PORT" --log-level warning
