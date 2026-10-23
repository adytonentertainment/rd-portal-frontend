#!/usr/bin/env bash
# Build the CURRENT source for the browser suite and serve it.
#
# A separate build (e2e/.tmp/build) pointed at the suite's own API, so the run
# tests exactly the code in the working tree and never the live API.
# E2E_SKIP_BUILD=1 reuses the previous build when only the tests changed.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
API_PORT="${E2E_API_PORT:-8100}"
PORT="${E2E_WEB_PORT:-3100}"
OUT="$HERE/.tmp/build"

cd "$ROOT"
if [ "${E2E_SKIP_BUILD:-0}" != "1" ] || [ ! -f "$OUT/index.html" ]; then
  BUILD_PATH="$OUT" \
    REACT_APP_BACKEND_URL="http://localhost:$API_PORT" \
    REACT_APP_FRONTEND_URL="http://localhost:$PORT/" \
    REACT_APP_STATEMENTS_LIVE=1 \
    npm run build >"$HERE/.tmp/build.log" 2>&1 || { tail -40 "$HERE/.tmp/build.log"; exit 1; }
fi
exec npx serve -s "$OUT" -l "$PORT" --no-clipboard
