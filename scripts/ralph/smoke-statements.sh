#!/bin/bash
# FE-006 live end-to-end smoke: dump the 14 real fixture files into the
# statement-ingestion backend, poll the pipeline to completion, and assert
# the PRD §2 expected figures via the same API surface the admin UI uses.
#
# Prereqs (see scripts/ralph/SMOKE.md):
#   - backend:  cd /Users/stevengarcia/VERAX_2/verax_backend && \
#               ADMIN_EMAILS="steven@verax.app,demo@demo.local" ./start_backend.sh
#   - worker:   ENVIRONMENT=DEVELOPMENT python3 scripts/run_ingest_worker.py
#
# Usage: bash scripts/ralph/smoke-statements.sh
#   TOKEN env var overrides the auto-minted dev JWT.
set -u

BACKEND="${BACKEND:-http://localhost:8000}"
BACKEND_DIR="/Users/stevengarcia/VERAX_2/verax_backend"
FIXTURES="$BACKEND_DIR/tests/fixtures/statements"

# --- auth: mint a 1-day HS256 JWT for the seeded dev admin (User id 1,
# steven@verax.app / username stevenhj) using SECRET_KEY from the backend's
# .env.development. Same shape as POST /auth/token issues. -------------------
if [ -z "${TOKEN:-}" ]; then
  TOKEN=$(python3 - "$BACKEND_DIR/.env.development" <<'PY'
import base64, hashlib, hmac, json, re, sys, time

env = open(sys.argv[1]).read()
secret = re.search(r'^SECRET_KEY="([^"]+)"', env, re.M).group(1)

def b64(d):
    return base64.urlsafe_b64encode(d).rstrip(b"=")

header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
payload = b64(json.dumps({
    "sub": "stevenhj", "id": 1, "email": "steven@verax.app",
    "exp": int(time.time()) + 86400,
}).encode())
sig = b64(hmac.new(secret.encode(), header + b"." + payload, hashlib.sha256).digest())
print((header + b"." + payload + b"." + sig).decode())
PY
  ) || { echo "FATAL: could not mint dev token"; exit 1; }
fi
AUTH="Authorization: Bearer $TOKEN"

api() { curl -s --max-time 30 -H "$AUTH" "$BACKEND$1"; }

# --- 0. backend reachable + token accepted? (docs are disabled; use the API) --
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -H "$AUTH" "$BACKEND/admin/statements/batches")
[ "$code" = "200" ] || { echo "FATAL: backend/auth check failed at $BACKEND (got $code)"; exit 1; }
echo "ok: backend up at $BACKEND, admin token accepted"

# --- 1. upload all 14 loose fixture files ------------------------------------
form_args=()
count=0
while IFS= read -r f; do
  form_args+=(-F "files=@$f")
  count=$((count + 1))
done < <(find "$FIXTURES" -name '*.pdf' -o -name '*.xlsx' | sort)
[ "$count" = "14" ] || { echo "FATAL: expected 14 fixture files, found $count"; exit 1; }

resp=$(curl -s --max-time 120 -H "$AUTH" -X POST "${form_args[@]}" "$BACKEND/admin/statements/uploads")
upload_id=$(echo "$resp" | python3 -c "import sys,json;print(json.load(sys.stdin)['upload_id'])" 2>/dev/null)
[ -n "$upload_id" ] || { echo "FATAL: upload failed: $resp"; exit 1; }
echo "ok: uploaded 14 files -> upload_id=$upload_id"

# --- 2. poll every 2s until the pipeline reaches done/failed -----------------
status=""
for i in $(seq 1 300); do
  poll=$(api "/admin/statements/uploads/$upload_id")
  status=$(echo "$poll" | python3 -c "import sys,json;print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  case "$status" in
    done|failed) break ;;
  esac
  sleep 2
done
[ "$status" = "done" ] || { echo "FATAL: pipeline ended as '$status': $poll"; exit 1; }
echo "ok: pipeline done (poll #$i)"

# --- 3. assert the world via the read API ------------------------------------
batches=$(api "/admin/statements/batches")

batch_checks=$(echo "$batches" | python3 -c '
import json, sys
batches = json.load(sys.stdin)
assert len(batches) == 5, f"expected 5 batches, got {len(batches)}"
total = sum(b["statement_count"] for b in batches)
assert total == 7, f"expected 7 statements across batches, got {total}"
yt26 = [b for b in batches if b["period_code"] == "PUB26H1" and b["catalog"] == "YT"]
assert len(yt26) == 1, "expected exactly one PUB26H1/YT batch"
print(" ".join(str(b["id"]) for b in batches))
print(yt26[0]["id"])
') || { echo "FATAL: batch assertions failed"; echo "$batches"; exit 1; }
batch_ids=$(echo "$batch_checks" | sed -n 1p)
yt_batch=$(echo "$batch_checks" | sed -n 2p)
echo "ok: 5 batches, 7 statements (PUB26H1/YT batch id=$yt_batch)"

blockers=0
for bid in $batch_ids; do
  b=$(api "/admin/statements/batches/$bid" | python3 -c "import sys,json;print(json.load(sys.stdin)['finding_counts']['blocker'])")
  blockers=$((blockers + b))
done
[ "$blockers" = "0" ] || { echo "FATAL: expected 0 open blockers, got $blockers"; exit 1; }
echo "ok: 0 open blockers across all batches"

# --- 4. PUB26H1/YT batch: key figures the UI must show -----------------------
stmts=$(api "/admin/statements/batches/$yt_batch/statements")
stmt_ids=$(echo "$stmts" | python3 -c '
import json, sys
stmts = json.load(sys.stdin)
by_code = {s["account_code"]: s for s in stmts}
c650 = by_code["C00650"]
assert abs(float(c650["payable"]) - 45193.21) < 0.01, f"C00650 payable {c650['payable']}"
assert c650["writer_name"] == "El Taiger", c650["writer_name"]
c739 = by_code["C00739-New"]
assert c739["zero_pay_reason"] == "threshold_carryover", c739["zero_pay_reason"]
print(c650["id"])
') || { echo "FATAL: statement key-figure assertions failed"; echo "$stmts"; exit 1; }
echo "ok: C00650 payable 45,193.21; C00739-New threshold_carryover"

# --- 5. C00650 drill-down: waterfall + paginated lines ------------------------
api "/admin/statements/$stmt_ids" | python3 -c '
import json, sys
s = json.load(sys.stdin)
assert abs(float(s["carried_forward_in"]) - 38529.94) < 0.01, s["carried_forward_in"]
assert abs(float(s["calculated"]) - 6663.27) < 0.01, s["calculated"]
assert abs(float(s["detail_sum"]) - float(s["calculated"])) < 0.01
' || { echo "FATAL: C00650 waterfall assertions failed"; exit 1; }
echo "ok: C00650 waterfall — calculated 6,663.27 + carried forward 38,529.94 -> payable 45,193.21"

api "/admin/statements/$stmt_ids/lines?page=1&page_size=50" | python3 -c '
import json, sys
p = json.load(sys.stdin)
assert p["total"] == 4674, p["total"]
assert len(p["items"]) == 50
assert p["items"][0]["earnings"] is not None
' || { echo "FATAL: C00650 lines pagination assertions failed"; exit 1; }
echo "ok: C00650 lines paginate (4,674 total, 50/page)"

# --- 6. waive an open warning (if validation produced one) --------------------
finding=$(api "/admin/statements/batches/$yt_batch/findings?status=open" | python3 -c "
import sys, json
fs = [f for f in json.load(sys.stdin) if f['severity'] in ('blocker', 'warning')]
print(fs[0]['id'] if fs else '')")
if [ -n "$finding" ]; then
  waived=$(curl -s --max-time 30 -H "$AUTH" -H 'Content-Type: application/json' \
    -X POST -d '{"reason":"smoke test waiver"}' "$BACKEND/admin/findings/$finding/waive" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('status',''))")
  [ "$waived" = "waived" ] || { echo "FATAL: waive flow failed on finding $finding"; exit 1; }
  echo "ok: waived finding $finding (status=waived)"
else
  echo "ok: no open blocker/warning findings on PUB26H1/YT to waive (skipped)"
fi

echo
echo "SMOKE PASSED"
