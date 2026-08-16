# PRD — Royalty Statement Ingestion, Verification & Client Portal Distribution

**Owner:** Steven Garcia / Regalias Digitales, LLC
**Status:** Draft v1 (2026-07-06)
**Scope:** End-to-end pipeline that takes a raw statement batch (as delivered by WeTransfer today), ingests and validates it, and publishes per-writer statements to each client's portal.
**Relationship to prior docs:** This consolidates and supersedes the ingestion/verification/distribution portions of `PRD-statement-data-integration.md`. Phase-1 primitives already exist in `verax_backend` (branch `ralph/statement-data-integration`: `app/services/statement_ingest/{filename_parser,sorter,pdf_parser,xlsx_parser,worker,storage}.py`) and `verax_frontend RD` (branch `ralph/statement-admin-ui`). Treat those as the starting point, not a greenfield.

---

## 1. Problem

Regalias Digitales receives royalty statement batches from its distributor/collection back office as a single WeTransfer drop containing thousands of PDF + XLSX file pairs. Today the reference drop is:

```
wetransfer_h2-2025-and-h1-2026-statements_2026-06-10_1613/  (2.0 GB, 5,227 files)
```

There is no system of record. To pay and inform writers, someone must manually reconcile spreadsheets against PDFs, figure out which files belong to which writer, catch missing/duplicate/mismatched statements by eye, and email PDFs out. This does not scale (2,612 statements per drop), is error-prone, and gives writers no self-service access to their earnings history.

**We need a control-plane pipeline:** ingest a batch → verify it is complete and internally consistent → gate on a human sign-off → distribute the correct statement to each writer's portal.

> **Payment happens externally, first.** This system is **post-payment document distribution and reconciliation** — it does not move money and does not calculate royalties. It sorts, verifies, and publishes documents of record. (Confirmed scope, June 2026.)

---

## 2. Ground truth — the source data (verified 2026-07-06)

### 2.1 A "batch" is one royalty type for one period

The reference drop contains **6 batches** across **2 royalty types**, not "two periods." Verified counts:

| Batch folder | Type | Period | Cadence | PDF | XLSX |
|---|---|---|---|---:|---:|
| `Regalias Digitales Mechanical … 2025H2 …_20251120` | Mechanical | 2025 H2 | semiannual | 533 | 533 |
| `Regalias Mechanical … 2026H1 …_20260530` | Mechanical | 2026 H1 | semiannual | 580 | 579 |
| `Regalias YouTube Publishing … 2025H2 …_20251125` | YouTube | 2025 H2 | semiannual | 696 | 697 |
| `Regalias YouTube Publishing … 2026H1 …_20260529` | YouTube | 2026 H1 | semiannual | 758 | 758 |
| `Regalias YouTube Publishing … 2025Q4 …_20251124` | YouTube | 2025 Q4 | quarterly | 21 | 21 |
| `Regalias YouTube Publishing … 2026Q2 …_20260528` | YouTube | 2026 Q2 | quarterly | 24 | 24 |

Notes the pipeline must tolerate:
- **PDF/XLSX counts diverge** (580 vs 579; 696 vs 697). Pairing must be by identity, not by count — and unmatched files are a first-class finding, not a crash.
- Folder names are human-typed and inconsistent: a typo (`Satements`), an extra `Digitales`, and varying `(pdf+xls details)` / underscore placement. **Never parse period/type from the folder name.** Parse from the per-file `Ben_PUB…` code and the `(Type)` suffix, and treat the folder only as a grouping hint.
- Quarterly batches (Q4, Q2) cover ~21–24 "special" accounts (the Luna Negra family: `C00139*`, plus a few) that also appear in the semiannual YouTube batches. Cadence is per-account, not global.

### 2.2 File naming and pairing

```
Ben_PUB<YY><H#|Q#>_<BeneficiaryID> - <Name> (<Type>).pdf
Ben_PUB<YY><H#|Q#>_<BeneficiaryID> - <Name> (<Type>).xlsx   # some drops use "_<ID>_<Name>"
```

Examples:
- `Ben_PUB25H2_JN0303 - Arelys Henao (Mechanical Royalties).pdf`
- `Ben_PUB26H1_C00768 - Rob Vicious (YouTube Publishing).pdf`
- `Ben_PUB26Q2_C00139f - Edipurepecha (Luna Negra) (YouTube Publishing).pdf`

Parsed fields: **period token** (`PUB25H2`), **beneficiary ID** (`JN0303`, `C00768`, `C00139f`), **display name**, **type** (`Mechanical Royalties` | `YouTube Publishing`). The `(Type)` suffix is the authoritative type discriminator. A statement = the PDF + XLSX sharing the same `(period, beneficiaryID, type)` key.

Beneficiary ID prefixes seen: `JN####`, `C#####`, `CS####`, `CSJ###`, `CPJ###`, with lowercase suffixes for sub-accounts/splits (`JN0324b`, `C00139a`). **The ID is stable within a batch; it is the join key, not the name** (names drift — see §2.5).

### 2.3 XLSX detail schema — differs by type (this is the "two sources")

Sheet name: `Blad1`. Header is usually row 1, but **some files have a blank leading row** — detect the header row, don't assume row 1. Last row is a **grand-total row where only `Earnings` is populated** — it must be excluded from line-item sums.

**Mechanical** columns:
```
Period, Beneficiary, Name, SongCode, SongTitle, Country, Channel,
IncomeSource, IncomeType, Price, CommissionRate%, RBP, Rate_Applied,
WrtierSplit%, BenSplit%, Units, Earnings
```

**YouTube Publishing** columns:
```
Period, Beneficiary, Name, AssetID, CustomID Client, SongTitle, Country, Channel,
IncomeSource, IncomeType, Price, CommissionRate%, RBP, Rate_Applied,
ContPer, BenSplit%, Units, Earnings
```

Divergences the parser must handle:
- Work identifier: Mechanical `SongCode` vs YouTube `AssetID` (+ `CustomID Client`).
- Split column: Mechanical `WrtierSplit%` (**note the misspelling — match literally**) vs YouTube `ContPer`.
- Numbers are stored as floats in scientific notation (`1.3788869999999999E-4`). Sum in decimal, round for display only.
- `IncomeType` vocabularies differ (`MECH-HFA`, `STRM-SUB` for mechanical; `AVOD-BR`, `In Master`, `In Publishing` for YouTube) and drive the earnings breakdowns writers see.

**Design implication:** one abstract `StatementLine` model with a `royalty_type` discriminator and a nullable superset of columns; two type-specific parser adapters that normalize into it. Keep the raw work identifier under a single `work_ref` field plus a `work_ref_kind` (`songcode` | `assetid`).

### 2.4 PDF account summary — the statement of record

The PDF is what the writer receives and what we distribute. Its "Account Summary" block is the ledger:

```
Payable = Royalties calculated − recouped ± reserves + carried forward
          + previous-period payable − settlement
```

The aggregation already extracted this into `pdf_full.csv` at the drop root, columns:
```
folder | file | calculated | recouped | reserve_taken | reserve_released |
carried_forward | before_tax | payable_this | payable_prev | settlement | payable
```

**Core reconciliation invariant (verified):** `Σ(XLSX line Earnings) == PDF "Royalties calculated"` — held to the cent for 2,609/2,611 non-house statements in the reference drop. This is the single most important verification rule (§5, V-STMT-RECON).

### 2.5 Realities the pipeline must absorb

- **No canonical writer ID across catalogs.** A writer can hold a `JN####` mechanical ID and a `C#####` YouTube ID with no link except a name that drifts (`Javier Solis` vs `Javier Solís`, `(Split with Manager)` suffixes). Entity resolution is name-based + human-confirmed.
- **House / non-writer accounts** exist and must not be distributed to writers: `CS0001` (Regalias Digitales YouTube house account), `CPJ001` (performance royalties, PDF-only, no XLSX). Maintain a house-account exclusion list.
- **Legitimate zero/negative states:** a statement can be fully recouped (payable 0), carry a reserve, or be carried forward — none of these are errors.
- **Cross-cadence duplication:** a special account appears in both its quarterly and the semiannual batch. The distribution layer must not double-show the same period's earnings.

---

## 3. Goals / Non-goals

### Goals
1. **Ingestion:** point the system at a batch (folder or zip), and have it deterministically discover, pair, classify, parse, and stage every statement, surfacing every anomaly.
2. **Verification:** a rules engine that proves a batch is complete and internally consistent before anyone distributes, with severities and an explicit human waiver path.
3. **Distribution:** a gated, auditable publish that puts the right PDF (+ optional earnings breakdown) into the right writer's portal, idempotently and reversibly.
4. Full audit trail: who ingested, what validation said, who signed off, what was published when.

### Non-goals (this phase)
- Calculating or paying royalties (happens upstream/externally).
- Email/SMS notifications — **explicitly deferred** (keep nullable `contact_email` + distribution records so it can be backfilled later).
- Writer self-service tax forms, disputes, or messaging.
- Automated entity resolution without human confirmation.

---

## 4. Users

| User | Needs |
|---|---|
| **Admin (Steven / back office)** | Upload a batch, watch ingestion, review findings, resolve entities, sign off, distribute, and roll back. |
| **Writer (client)** | Log into their portal, see their statements per period, download the PDF, view an earnings breakdown, trust it's complete and correct. |
| **System/auditor** | Reconstruct exactly what was published to whom and why it was allowed. |

---

## 5. The three-stage pipeline

```
   RAW BATCH                INGESTION              VERIFICATION            DISTRIBUTION
 (folder / zip)   ─▶   discover · pair ·   ─▶   rules engine ·      ─▶   entity match ·
  2,612 pairs          classify · parse ·        completeness ·           readiness gate ·
                       stage + hash              reconciliation ·         publish to portal ·
                                                 severity + waivers       audit + rollback
        │                     │                        │                        │
     Batch                Statement +              Findings +               Distribution
     (staged)             StatementLine            waiver state             records
```

### Stage A — Data Ingestion

**Trigger:** admin uploads a `.zip` or points at a server-side folder. A DB-polled worker (already scaffolded: `worker.py`) picks up the job.

**Steps:**
1. **Unpack & inventory.** Recursively enumerate files; ignore `.DS_Store` and other junk. Record raw path, size, and a content hash (sha256) for every file — hash is the dedup and idempotency key.
2. **Filename parse** (`filename_parser.py`): extract `(period, beneficiary_id, name, type)`. Files that don't match the pattern → `unparseable_file` finding (do not drop silently).
3. **Pair** PDF↔XLSX by `(period, beneficiary_id, type)`. Unpaired PDF or XLSX → finding (`missing_xlsx` / `missing_pdf`). Extra copies with same key but different hash → `duplicate_conflict`.
4. **Classify** royalty type from the `(Type)` suffix; route to the correct parser adapter.
5. **Parse:**
   - PDF (`pdf_parser.py`): extract the Account Summary ledger fields (§2.4).
   - XLSX (`xlsx_parser.py`): detect header row, read `Blad1`, drop the grand-total row, normalize each line into `StatementLine` via the type adapter.
6. **Stage** parsed statements + lines in the DB in a `staged` state, linked to the batch. Original files are stored immutably (`storage.py`) and referenced by hash.

**Ingestion is idempotent:** re-uploading the same drop (same hashes) updates nothing and creates no duplicates; a corrected drop supersedes by hash with the prior version retained.

**Data model (SQLAlchemy + Alembic on existing Postgres):**
- `batch` — id, source_label, royalty_type, period, cadence, uploaded_by, uploaded_at, status (`ingesting|ingested|validated|distributing|distributed|failed`), file_count, statement_count.
- `statement` — id, batch_id, beneficiary_id, display_name, royalty_type, period, pdf_file_id, xlsx_file_id, detail_sum, calculated, payable, ledger fields (§2.4), status (`staged|valid|flagged|waived|published`), writer_id (nullable until resolved).
- `statement_line` — id, statement_id, royalty_type, work_ref, work_ref_kind, song_title, country, channel, income_source, income_type, price, commission_rate, rbp, rate_applied, writer_split, ben_split, units, earnings.
- `stored_file` — id, sha256, kind (`pdf|xlsx`), byte_size, storage_path, original_filename.
- `finding` — id, batch_id, statement_id (nullable), rule_id, severity, message, status (`open|waived|resolved`), waived_by, waived_reason, created_at.
- `writer` — id, canonical_name, contact_email (nullable), account_ids (JSON: {mechanical:[…], youtube:[…]}), is_house (bool).
- `distribution` — id, statement_id, writer_id, batch_id, published_at, published_by, portal_visible (bool), superseded_by (nullable), audit JSON.

### Stage B — Data Verification

A rules engine (scaffolded under `app/services/validation/`) runs over a staged batch and emits `finding` rows. Rules are pure functions `(batch, statements, lines) → findings`, each with a stable `rule_id` and severity. Four scopes:

**V-FILE (file/pairing integrity)**
- `V-FILE-PAIR`: every statement has both a PDF and an XLSX. (error)
- `V-FILE-PARSE`: every file matched the naming pattern and parsed. (error)
- `V-FILE-DUP`: no two different files claim the same `(period, id, type)` with conflicting content. (error)
- `V-FILE-TYPE`: `(Type)` suffix matches the XLSX schema detected. (error)

**V-STMT (per-statement consistency)**
- `V-STMT-RECON` *(core)*: `Σ(line Earnings) == PDF "Royalties calculated"` within $0.01. (error) — the reconciliation invariant.
- `V-STMT-LEDGER`: `payable` recomputes from the ledger identity (§2.4) within $0.01. (error)
- `V-STMT-SCHEMA`: required columns present for the type; grand-total row correctly excluded. (error)
- `V-STMT-NONNEG`: units ≥ 0; flag negative earnings lines for review. (warn)
- `V-STMT-EMPTY`: statement has ≥1 detail line unless payable is legitimately 0. (warn)

**V-BATCH (batch completeness)**
- `V-BATCH-COUNT`: statement count within expected band vs the prior comparable batch (roster drift is normal; a 50% drop is not). (warn)
- `V-BATCH-ROSTER`: every account expected for this period/type (from prior batches minus known exits) is present; new accounts flagged for onboarding. (warn)
- `V-BATCH-HOUSE`: house accounts (`CS0001`, `CPJ001`, …) identified and excluded from writer distribution. (info)

**V-LEDG (cross-period continuity)**
- `V-LEDG-CARRY`: this batch's `payable_prev` / `carried_forward` matches the prior period's `payable` for the same account. (warn) — catches skipped or out-of-order batches.
- `V-LEDG-CADENCE`: quarterly special-account earnings are not double-counted against the overlapping semiannual batch at distribution time. (error at distribution)

**Severity & waiver semantics:**
- `error` blocks the readiness gate; must be **resolved** (fix upstream + re-ingest) or **waived** with a reason by an admin.
- `warn` / `info` are visible but non-blocking.
- Every waiver records who/when/why and is part of the audit trail. Waivers are per-finding, never batch-wide "ignore all."

**Readiness gate (period-level):** a batch is `validated` and eligible for distribution only when **zero open errors** remain (resolved or waived) and required entity resolutions (§Stage C) are confirmed. The gate is computed, displayed, and enforced server-side — the Distribute action is disabled until green.

### Stage C — Shipping to Client Portals

**Precondition:** batch is `validated` and the gate is green.

1. **Entity resolution.** Map each non-house `statement.beneficiary_id` → a `writer`. Auto-match on exact prior mapping; propose name-similarity matches for new/ambiguous accounts; **admin confirms**. Unresolved statements cannot be published (they'd go to the wrong or no portal). Once confirmed, the `beneficiary_id → writer_id` mapping persists for future batches.
2. **Compose the deliverable.** For each resolved statement: the **PDF is the primary artifact**; optionally render an in-portal **earnings breakdown** (by income type / channel / country) from `statement_line`. De-duplicate overlapping cadence so a writer sees each period once (V-LEDG-CADENCE).
3. **Publish** — creates `distribution` rows and flips `portal_visible = true`. **Idempotent** (same statement+period publishes once; re-publish supersedes and links `superseded_by`). **Reversible** (unpublish hides from portal, keeps the record).
4. **Writer portal** (`WriterStatements.jsx`, `/earnings`): the writer sees a list of periods, per-period payable, a PDF download, and the earnings breakdown. Only `portal_visible` distributions appear.
5. **Audit:** every publish/unpublish/supersede records actor, timestamp, and the gate state at publish time.

**Notifications are out of scope** — the `distribution` record is designed so a later email step can select "published but not-yet-notified" and backfill.

---

## 6. Admin panel UX (maps to existing RD screens)

- **Batches** (`AdminStatements`/`AdminDistributions`): list of batches with status, counts, and a finding-severity summary. *(Known gap to fix: BatchSummary API currently returns no finding counts — badges show "—". Add counts to the summary endpoint.)*
- **Upload** (`AdminStatementUpload`): drop a zip / pick a folder → live ingestion progress.
- **Batch detail** (`AdminStatementDetail`): findings grouped by rule/severity, each with drill-down to the offending statement/line; per-finding **Waive** (reason required) and **Resolve**; the readiness-gate indicator.
- **Statement drill-down:** side-by-side PDF viewer + parsed line table + reconciliation delta.
- **Writers** (`AdminWriters`): roster, account-id mappings, entity-resolution queue for new/ambiguous accounts.
- **Distribute:** disabled until gate green; shows a pre-flight summary (N writers, M statements, house accounts excluded, cadence de-dup applied) → confirm → publish → per-writer result.

---

## 7. API surface (FastAPI, admin-role gated: `app/routers/statements_admin.py`)

```
POST   /admin/batches                     # create + upload (zip) → kicks off ingestion
GET    /admin/batches                     # list w/ status + finding-severity counts
GET    /admin/batches/{id}                # detail
GET    /admin/batches/{id}/findings       # filter by severity/rule/status
POST   /admin/findings/{id}/waive         # {reason} → waived
POST   /admin/findings/{id}/resolve
GET    /admin/batches/{id}/gate           # readiness gate state
GET    /admin/statements/{id}             # ledger + lines + file refs
GET    /admin/writers                     # roster
POST   /admin/writers/{id}/accounts       # attach beneficiary_id → writer
GET    /admin/batches/{id}/resolution     # entity-resolution queue
POST   /admin/batches/{id}/distribute     # gated publish
POST   /admin/distributions/{id}/unpublish
# Writer-facing:
GET    /me/statements                     # portal_visible distributions
GET    /me/statements/{id}/pdf            # signed download
GET    /me/statements/{id}/breakdown      # earnings by income-type/channel/country
```

---

## 8. Backfill plan — the six existing batches

Ingest in **chronological order per type** so V-LEDG carry-forward continuity validates naturally:

1. Mechanical 2025H2 → 2. Mechanical 2026H1
3. YouTube 2025Q4 → 4. YouTube 2025H2 → 5. YouTube 2026Q2 → 6. YouTube 2026H1

Expected findings to triage (not bugs): the 580/579 and 696/697 pair mismatches (missing-file findings), the ~21–24 cross-cadence special accounts (V-LEDG-CADENCE), and house accounts `CS0001`/`CPJ001` (excluded). Cross-check every batch's aggregate against the pre-computed `royalty_summary.csv` and `pdf_full.csv` at the drop root as an independent oracle for the parsers.

---

## 9. Phasing

- **Phase 1 — Ingestion + Verification (largely BUILT):** parsers, sorter, worker, validation engine, admin read/waive APIs, admin UI. **Remaining:** wire finding counts into BatchSummary; harden header-row/blank-row detection and type-adapter split; confirm V-STMT-RECON runs on real fixtures for both types.
- **Phase 2 — Entity resolution:** writer roster, account mapping, resolution queue + confirm UI.
- **Phase 3 — Distribution gate + publish:** readiness gate enforcement, `distribution` records, cadence de-dup, publish/unpublish, audit.
- **Phase 4 — Writer portal delivery:** statement list, PDF download, earnings breakdown; (later) email notifications.

---

## 10. Risks & open questions

1. **Entity resolution accuracy** — wrong `beneficiary_id → writer` mapping ships a writer's earnings to the wrong portal. Mitigation: human-confirm every new/ambiguous mapping; never auto-publish an unconfirmed one.
2. **Parser drift** — a future drop changes column order/names (the `WrtierSplit%` typo could get "fixed" upstream). Mitigation: schema-detection + V-FILE-TYPE + V-STMT-SCHEMA fail loudly rather than mis-map.
3. **Cross-cadence double-counting** for special accounts. Mitigation: V-LEDG-CADENCE as a distribution-blocking rule.
4. **House-account leakage** to a portal. Mitigation: explicit `is_house` exclusion list, enforced at distribution.
5. **Contact/email list still outstanding** — keep everything email-ready but decoupled; do not block distribution on it.
6. **Open:** authoritative roster of "expected accounts per period" for V-BATCH-ROSTER — bootstrap from the union of existing batches, then maintain a joiners/leavers list.

---

## Appendix A — Verified dataset cheat-sheet (2026-07-06)

- Reference drop: `~/Downloads/wetransfer_h2-2025-and-h1-2026-statements_2026-06-10_1613/`, 2.0 GB, 5,227 files, 2,612 PDF+XLSX pairs.
- 6 batches / 2 types (Mechanical, YouTube Publishing) / periods 2025H2, 2025Q4, 2026H1, 2026Q2.
- Pair mismatches: 580/579 (Mech 26H1), 696/697 (YT 25H2). Reconciliation held to the cent for 2,609/2,611 non-house statements.
- XLSX sheet `Blad1`; grand-total row = only `Earnings` populated (exclude); some files have a blank leading row.
- Mechanical key cols: `SongCode`, `WrtierSplit%` [sic]. YouTube key cols: `AssetID`, `CustomID Client`, `ContPer`.
- House accounts: `CS0001` (RD YouTube), `CPJ001` (performance, PDF-only). Special quarterly family: `C00139*` (Luna Negra).
- Pre-computed oracles at drop root: `royalty_summary.csv` (batch,period,beneficiary,name,lines,detail_sum,stmt_total,mismatch) and `pdf_full.csv` (per-PDF ledger).
