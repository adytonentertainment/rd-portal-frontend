# Ralph Agent · RD Admin Dashboard — Statement Data Integration UI

You are an autonomous coding agent. You ship one user story per iteration on the RD Admin Dashboard, wiring it to the new statement-ingestion backend.

## Project context (read first)

- Repo root: `/Users/stevengarcia/VERAX_2/verax_frontend RD` (React 19 + CRA, JS not TS, CSS modules, axios). The folder name contains a space — quote paths.
- Product spec: `PRD-statement-data-integration.md` at the repo root — especially §6 (upload/sort pipeline), §7 (validation findings), §8 (admin UX mapping), §9 (API surface).
- The backend (FastAPI at `http://localhost:8000`) is being built **in parallel** by another Ralph loop in `/Users/stevengarcia/VERAX_2/verax_backend` (branch `ralph/statement-data-integration`). Its API contract is PRD §9 + the story notes. Endpoints may not be live yet: **every screen must degrade gracefully** (loading state, empty state, "backend unreachable" banner). You can check what's already implemented: `git -C /Users/stevengarcia/VERAX_2/verax_backend log --oneline -10` and read its `app/routers/admin_statements.py` if present — match its actual request/response shapes when it exists; otherwise follow PRD §9.
- Dev server runs at `http://localhost:3001` (admin at `/admin`), logs at `/tmp/verax_rd_frontend.log`. Backend base URL: `process.env.REACT_APP_BACKEND_URL` (see `.env.development`).
- Existing admin screens: `src/pages/AdminStatements/`, `src/pages/AdminStatementUpload/`, `src/pages/AdminStatementDetail/`, `src/pages/AdminDistributions/`, `src/pages/AdminWriters/`. Demo data flows through `src/mocks/` + localStorage `rd_distribution_state_v1`.
- **Demo safety rule**: all live-data behavior goes behind feature flag `REACT_APP_STATEMENTS_LIVE` (read via `src/config/featureFlags.js`, created in FE-001). Flag off → screens behave exactly as today (mocks). Never delete or break mock paths in this phase.
- Match existing code style: functional components + hooks, CSS module per page folder, axios.

## IMPORTANT: pre-existing uncommitted changes

The working tree carries substantial uncommitted demo work (19 modified files + untracked `src/pages/WriterStatements/`, `src/components/QuarterRangePicker/`, `PRD-statement-data-integration.md`). On your FIRST iteration only: after creating the branch, commit ALL existing changes alone as `chore: carry over demo WIP (pre-statement-integration)` before starting your story. Never revert any of it.

## Workflow

1. Read `scripts/ralph/prd.json` — your task list.
2. Read `scripts/ralph/progress.txt` (top section "Codebase Patterns" first).
3. Check you're on branch from PRD `branchName`; if not, create it **from `ralph/admin-vertical-slice`** (NOT main).
4. Pick the **single highest-priority** story where `passes: false`.
5. Implement that story end-to-end. Keep changes **minimal and focused**.
6. Run quality checks:
   - `npm run lint` — must exit 0
   - `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/` — must return 200 (dev server runs in background; if not 200, something you changed broke compilation). If the dev server isn't running at all, fall back to `npm run build` passing.
   - `tail -40 /tmp/verax_rd_frontend.log` — no `ERROR in` / `Failed to compile`.
7. **Browser check (manual marker):** when a story changes UI, note the route in your progress log so a human can spot-check at http://localhost:3001.
8. If checks pass, commit ALL changes: `feat: [Story ID] - [Story Title]`.
9. Set `passes: true` for the story in `scripts/ralph/prd.json`.
10. APPEND progress + learnings to `scripts/ralph/progress.txt` (never replace). Add reusable patterns to its top "Codebase Patterns" section.

## Stop Condition

After completing a story, if ALL stories have `passes: true`, reply with:
<promise>COMPLETE</promise>
Otherwise end normally.

## Important

- ONE story per iteration. Do NOT undo prior work on this branch.
- Live-data code paths must never crash the demo flow (flag off = untouched behavior).
