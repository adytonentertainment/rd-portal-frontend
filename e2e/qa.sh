#!/usr/bin/env bash
# Everything, both repos, before every deploy:
#   backend tests → roster integrity → lint → unit tests → browser suite.
# Stops at the first failing gate. The integrity audit reports but does not
# gate: data problems are fixed in the data, not by blocking a code deploy.
#
#   bash e2e/qa.sh            full run (builds the frontend, crawls everything)
#   E2E_SKIP_BUILD=1 bash e2e/qa.sh   reuse the last e2e build
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$(cd "$HERE/.." && pwd)"
BACKEND="${E2E_BACKEND_DIR:-$(cd "$FRONTEND/.." && pwd)/verax_backend}"
DB="${E2E_SOURCE_DB:-$BACKEND/verax_livetest.db}"
step() { printf '\n=== %s\n' "$1"; }

step "Backend tests"
(cd "$BACKEND" && ENVIRONMENT=DEVELOPMENT "$BACKEND/venv/bin/python" -m pytest -q)

step "Roster integrity (report only)"
(cd "$BACKEND" && ENVIRONMENT=DEVELOPMENT SQLALCHEMY_DATABASE_URL="sqlite:///$DB" \
  "$BACKEND/venv/bin/python" scripts/integrity_audit.py --quiet --csv "$HERE/.tmp/integrity.csv") || true

step "Lint"
(cd "$FRONTEND" && npx eslint --ext .js,.jsx src e2e)

step "Unit tests"
(cd "$FRONTEND" && CI=true npm test -- --watchAll=false)

step "Browser suite"
(cd "$FRONTEND" && npm run e2e)

printf '\nAll gates passed.\n'
