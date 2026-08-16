# Statement Integration — Live Smoke (FE-006)

Phase-1 end-to-end check: real fixture files through the real backend, verified
both scripted (API) and by hand (UI).

## 1. Start everything

```bash
# Backend (FastAPI :8000) — note venv python and ADMIN_EMAILS (backend-side gate)
cd /Users/stevengarcia/VERAX_2/verax_backend
ENVIRONMENT=DEVELOPMENT ADMIN_EMAILS="steven@verax.app,demo@demo.local" \
  venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Ingest worker (advances upload pipeline; without it uploads sit in 'uploaded')
ENVIRONMENT=DEVELOPMENT INGEST_POLL_SECONDS=2 venv/bin/python scripts/run_ingest_worker.py &

# Frontend dev server (:3001) with live statements ON
cd "/Users/stevengarcia/VERAX_2/verax_frontend RD"
REACT_APP_STATEMENTS_LIVE=1 PORT=3001 npm start
```

Gotchas (hit during FE-006):
- `./start_backend.sh` uses system `python3`, which lacks `pdfplumber`/`uvicorn`
  — always use `venv/bin/python`.
- If the dev DB (`tunescan_development.db`) predates the statement migrations,
  the pipeline fails with `no such column: statement.before_tax`. Fix: drop the
  statement-domain tables (statement, statement_line, statement_batch,
  statement_upload, validation_run, validation_finding, beneficiary_account,
  writer, writer_alias) and rerun `create_tables()` (see progress.txt FE-006).
- `ADMIN_EMAILS` is checked on the backend per-request; a valid login whose
  email isn't listed gets 403 on every /admin/statements route.

## 2. Scripted smoke (API-level)

```bash
bash scripts/ralph/smoke-statements.sh
```

Uploads the 14 fixture files from
`/Users/stevengarcia/VERAX_2/verax_backend/tests/fixtures/statements/`, polls
the pipeline to `done`, then asserts: 5 batches, 7 statements, 0 open
blockers, C00650 payable 45,193.21, C00739-New `threshold_carryover`, C00650
`carried_forward_in` 38,529.94, lines paginate (4,674 total @ 50/page), and a
waive round-trip when an open blocker/warning exists. Rerun-safe: a second
upload of the same files dedupes (still 5 batches / 7 statements).
Prints `SMOKE PASSED` on success. It mints its own dev JWT for
`steven@verax.app`; export `TOKEN=...` to override.

## 3. Human click-path (UI-level)

Log in as an admin (`steven@verax.app` — must be in BOTH the frontend
`ADMIN_EMAILS` list in `src/utils/auth.js` and the backend env var). Or paste
the smoke token into localStorage: `localStorage.setItem('token', '<jwt>')`.

1. **Upload** — http://localhost:3001/admin/statements/upload
   Drag all 14 files from the fixtures folder into the drop zone → Submit.
   Watch the progress bar, then the stage stepper run Sorting → Parsing →
   Validating → Done, with live counters. Sort summary shows
   "14 files → 5 batches → 7 writers" and no unsortable files.
2. **Batches list** — http://localhost:3001/admin/statements
   Shows 5 batches (PUB25H2/MECH, PUB25Q4/YT, PUB26H1/YT, PUB26H1/MECH,
   PUB26Q2/YT) with statement counts 1/1/2/2/1. (Finding-count badges show "—"
   — backend BatchSummary doesn't carry counts yet; noted in progress.txt.)
3. **Batch detail** — click the **YouTube 2026H1** (PUB26H1/YT) batch.
   Header shows status + 2 statements. Findings panel lists any validation
   findings grouped by rule family; statements table shows:
   - `C00650` El Taiger — Payable **45,193.21**, detail-sum ✓ match
   - `C00739-New` Swifty Blue NEW — Payable 0.00 with **threshold carryover**
     badge (zero pay is normal, explained — not alarmed)
4. **Drill-down** — click the C00650 row. Slide-over waterfall shows
   Calculated 6,663.27 → Carried forward in **38,529.94** → Payable
   45,193.21. Lines table paginates (4,674 lines, 50/page, Prev/Next).
5. **Waive** — if any open blocker/warning finding exists, click Waive →
   submit is disabled until a reason is typed → after submit the row renders
   struck-through with the reason under Details. Acknowledge on a warning
   flips the button to "Acknowledged ✓" (status stays open by design).
6. **Flag off** — restart the frontend without `REACT_APP_STATEMENTS_LIVE=1`:
   every admin screen must look exactly like the mock demo again.
