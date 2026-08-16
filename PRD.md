# RD — Demo Readiness PRD

**Status:** Demo-blocking work · demo scheduled for tomorrow
**Owner:** Steven Garcia
**Last updated:** 2026-05-19
**Real client:** The publisher being pitched manages **RedZed** and many other writers. Their actual statements (`Ben_PUB25H2_C00616_RedZed (YouTube Publishing).xlsx`, `Ben_PUB25H2_JN0232_RedZed (Mechanical Royalties).xlsx`) total **$36,294.94** for H2 2025.

---

## 1. What we're demoing

A white-labelled publisher portal where the publisher's ops team can:

1. **Manage a writer roster** — see every writer, add new ones, delete ones that have left, in the same view they live with.
2. **Bulk-upload real statement files** — drop any number of `.xlsx`/`.csv` files; the system auto-detects the writer, statement type and period from each filename and creates new writers on the fly if they aren't on the roster yet.
3. **Track documentation completeness per writer per period** — a writer is "ready" only when all required statement types for the current period have been uploaded.
4. **Distribute royalties once a period is closed** — one click sends the period's statement data into the writer's personal portal.
5. **Preview the writer's portal** — pop into any writer's view to show the client what their songwriters will see post-distribution.

The writer-facing side is a **read-only consumer** of what the admin distributes — total earnings, top works, by-source breakdown, by-territory, statements list, period chip selector.

---

## 2. Definition of done for the demo

The single end-to-end story that must work flawlessly on `http://localhost:3001/`:

1. Open `/admin`. Roster shows ~5 writers including **RedZed**. The banner reads "H2 2025 · N/M writers have all statements in".
2. Drop both real RedZed `.xlsx` files into the **Upload Statements** modal. Filenames auto-detect → writer "RedZed", types "Mechanical Royalties" + "YouTube Publishing", period H2 2025. Ingest.
3. RedZed's row flips to **Ready** with pending $36,295. The banner ticks up.
4. Click **Distribute $36,295** on RedZed's row. Row shows "just now" under Last distributed.
5. Use the **Preview as writer** dropdown → RedZed. Land on `/earnings` as RedZed.
6. The portal shows:
   - **Total Revenue: $36,295** (matching the statement reality)
   - **Top 3 platforms**: ICE / Spotify / Apple Music (or similar real sources)
   - **By-source pie**: Streaming ~74% · Performance ~26%
   - **Top earning works**: Rave In The Grave $5,451 etc. (real songs from the file)
   - **By territory**: US $19,692 · DE $3,615 · AU $2,487 · etc. (real totals)
   - **Statements list**: "Ben Mechanical Royalties · H2 2025 · $35,014.66" and "Ben YouTube Publishing · H2 2025 · $1,280.28"
   - **Period chip**: H2 2025 (selected, only chip available since only one period distributed)
7. The floating **Exit pill** returns to /admin.
8. The whole flow is repeatable: hit **Reset demo data** to start over.

If all 8 steps succeed without console errors, the demo is ready.

---

## 3. Personas in the demo

| Persona | URL | Default view |
|---|---|---|
| **Publisher admin** | `/admin` or `/persona/admin` | Writers roster |
| **RedZed** (writer) | `/persona/redzed` or `/persona/-5` | `/earnings` with H2 2025 data |
| Demo Writer | `/persona/-1` | `/earnings` |
| Ava Brooks | `/persona/-2` | `/earnings` |
| M. Okonkwo | `/persona/-3` | `/earnings` |
| The Vine Sessions | `/persona/-4` | `/earnings` |

No login screen. UserContext auto-injects the persona-derived user on every page load.

---

## 4. Statement model

- **Period**: half-yearly. Current closed period = `H2 2025` (Jul–Dec 2025).
- **Required statement types per writer per period** (publisher-wide):
  - Mechanical Royalties
  - YouTube Publishing
- **File naming convention**: `Ben_PUB25H2_<benCode>_<WriterName> (<StatementType>).xlsx`
  - Period: extracted via regex `(\d{2})H([12])` → `H{half} 20{year}`
  - Writer: last `_`-separated segment before the parens
  - Statement type: parens content (`(YouTube Publishing)` etc.)
- **Auto-create writers** from filenames if the parsed writer name isn't on the roster.

---

## 5. State persistence

The demo runs entirely client-side. All mutable state is persisted to `localStorage` under `rd_distribution_state_v1`:

- Per-writer pending royalties, distributed total, last distributed timestamp, distributed periods set
- Per-(writer × period) statement-type receipts
- Added writers (id ≤ -100)
- Tombstoned writer IDs (so deletions survive reload)
- Recent uploads log

A **Reset demo data** link under the admin subtitle wipes the key and reloads.

---

## 6. Distribution gating (writer portal)

The writer portal at `/earnings` is **completely gated on distribution state**:

- If `state.byWriter[writerId].distributedPeriods.size === 0` → render the empty "Statements pending distribution" state.
- Otherwise:
  - Period chips show all writer-distributed periods (sorted newest first)
  - Default selection = newest period
  - Multi-select supported (click multiple chips, or **All**)
  - `filteredTransactions` filtered to only include `t.period ∈ selectedPeriods`
  - Every aggregate (Total Revenue, Top 3 Platforms, by-source pie, by-territory, top works, statements) recomputes from filtered transactions

---

## 7. Known sharp edges to harden before tomorrow

These are the items Ralph should sweep:

- **DE-001** · If `state.byWriter[writerId]` is missing for a writer in the roster (corrupted localStorage), the page should not crash; treat as zero state.
- **DE-002** · `Distribute all ready` button on /admin only counts writers whose doc status is complete (already enforced server-side); UI should disable the button when totalReady === 0 (done; verify).
- **DE-003** · Adding a writer with a duplicate name should focus the existing entry instead of silently no-oping.
- **DE-004** · Per-row delete button (×) should remain hover-visible on touch devices too (no `:hover`-only affordance).
- **DE-005** · The empty-state ("Statements pending distribution") should include a short period label (e.g., "Awaiting H2 2025") so writers understand what they're waiting on.
- **DE-006** · The Upload Statements modal should show a summary toast / banner after successful ingest ("3 statements ingested. 2 writers created.").
- **DE-007** · `/admin` sidebar should highlight the current page (just **Writers**).
- **DE-008** · The "Preview as writer" dropdown should not preselect any writer on initial render (it does — already verified, but lock it down with a regression).
- **DE-009** · `useEffect` that loads transactions in Revenue.jsx must re-run when distribution state changes — otherwise after admin clicks Distribute and the writer portal is already mounted, the data may not refresh. (Likely the source of "Distribute → no data" symptoms.)
- **DE-010** · `filteredTransactions` should include a tie-breaker on `selectedPeriods.length === 0` so a misclick that empties the chip selection still shows distributed data instead of going blank.
- **DE-011** · Reset demo data should also clear `rd_persona` and `selectedClientId` from localStorage so a fresh admin lands cleanly on /admin.
- **DE-012** · The admin "Distribute $X" button should give some visual feedback on click (brief disabled state / spinner) so the user knows it fired.
- **DE-013** · When viewing as a writer with multiple distributed periods, the chips should sort newest-first using a date-aware comparator (current sort is lexicographic — works for "H2 2025" / "H1 2026" but breaks for "H1 2025" / "H2 2024").
- **DE-014** · Documentation completeness checklist on `/admin/writers/:id` should show ✓ for each received statement type and ⏱ for each missing — and the period label so the publisher knows which half-year they're looking at.
- **DE-015** · `getEarningsForClient` for a writer with no entry in WRITER_EARNINGS should fall back to a writer-name-keyed archetype OR scale to the writer's actual ingested statements (today it falls back to `archetypeForId` which can produce mismatched data).
- **DE-016** · After bulk upload that auto-creates writers, the admin home should scroll the table or highlight the new rows so the user can see them.

---

## 8. Out of scope for the demo

- Real backend integration. All data is local mock + persisted in localStorage.
- Statement parsing (the modal does a fake parse based on file size).
- Writer-portal payout/tax settings.
- Multi-publisher (tenant) support.
- Currency conversion (everything is USD).

---

## 9. Repro for the symptom "distribute, then writer portal empty"

1. Open `/admin`, see RedZed with pending $X.
2. Click **Distribute** on RedZed.
3. Navigate to `/persona/redzed`.
4. Expected: portal shows H2 2025 data.
5. Actual (reported): portal is empty.

**Most likely cause (to confirm in Ralph):**
- Stale `localStorage` from earlier testing (writers tombstoned, receivedByWriter cleared, etc.) — fixed by hitting **Reset demo data**.
- Race between `setUploadedTransactions` (async via `useEffect`) and the period-filter recompute — fixed by adding distribution-state subscription to the transaction-load effect (DE-009).

**Mitigations to ship before the demo:**
- Always run **Reset demo data** before the demo opens.
- Confirm DE-009 fix lands.
- Confirm `localStorage.getItem('rd_distribution_state_v1')` after distribute step contains the new period in `byWriter[-5].distributedPeriods`.

---

## 10. Ralph plan

Ralph will iterate on the items in §7 as discrete user stories in `scripts/ralph/prd.json`. Each story includes acceptance criteria that can be verified by clicking through `/admin` and `/persona/redzed`. Ralph commits after each green story to the existing `ralph/admin-vertical-slice` branch.

Demo prep order (priority):

1. **DE-009** — the core "distribute → portal updates" reliability bug
2. **DE-001** — corrupted-state resilience
3. **DE-010** — period chip selection robustness
4. **DE-011** — Reset wipes all persona/client keys
5. **DE-012** — distribute button click feedback
6. **DE-005** — empty state names the awaiting period
7. **DE-013** — period chip sort
8. **DE-014** — doc completeness ✓/⏱ checklist
9. **DE-006** — upload success toast
10. **DE-003** — add-writer duplicate handling
11. **DE-004** — delete affordance on touch
12. **DE-015** — earnings fallback consistency
13. **DE-016** — highlight new writers after bulk create
14. **DE-007** — sidebar active state
15. **DE-008** — preview dropdown initial state

---

## 11. Operating procedure for the demo

1. Before client arrives, in the browser:
   - Open `http://localhost:3001/admin`
   - Click **Reset demo data** → confirm
   - Verify roster shows: Demo Writer, Ava Brooks, M. Okonkwo, The Vine Sessions, RedZed
   - Verify banner reads `H2 2025 · 5/5 writers have all statements in` OR an awaiting state for the demo narrative
2. Walk the client through §2.
3. If something feels off mid-demo: reload → reset → re-run.
