# PRD — Verax Publisher Platform Infrastructure
## Writer Portal + Admin Dashboard, built from Royalty Statements + Client List

**Owner:** Steven Garcia / Regalias Digitales, LLC
**Status:** Draft v1.1 (2026-07-06) — updated same day after the client list (`Client List for Verax.xlsx`) was delivered and profiled; §3.2, §5.1, §7 revised from assumed contract to verified structure.
**Scope:** The full production infrastructure — data layer, storage, auth/identity, ingestion services, background workers, API, deployment, and security — required to run the publisher **admin dashboard** and the **writer portal** as a real multi-user product, seeded from exactly two inputs: (1) the royalty statement drops and (2) the publisher's client list.
**Relationship to prior docs:**
- `PRD-royalty-ingestion-verification-distribution.md` defines the ingest → verify → distribute *pipeline* and its rules engine. This PRD does not restate those rules; it defines the *platform the pipeline runs on* and everything around it (identity, provisioning, hosting, storage, security).
- `PRD.md` (Demo Readiness) defined a localStorage-only demo. This PRD is the path from that demo to production: same screens, real backend.
- Backend scaffolding already exists and is the starting point, not greenfield: `verax_backend/app/models/statements.py` (Publisher, Writer, WriterAlias, BeneficiaryAccount, StatementUpload, StatementBatch, Statement, StatementLine, ValidationRun, ValidationFinding), `app/services/statement_ingest/` (filename_parser, sorter, pdf_parser, xlsx_parser, worker, storage), `app/services/validation/`, `app/routers/statements_admin.py`, and a working JWT auth stack in `app/routers/auth.py` (passlib + jose, rate limiting, account lockout, email verification via itsdangerous).

---

## 1. Problem

Regalias Digitales manages ~1,300+ writer accounts across two catalogs (Mechanical, YouTube Publishing). Every period it receives a WeTransfer drop of thousands of PDF+XLSX statement pairs (reference drop: 2.0 GB, 5,227 files, 2,612 statements). Today:

- There is **no system of record** — statements live in a Downloads folder.
- There is **no writer identity system** — writers are names in filenames; the same person holds unlinked `JN####` (mechanical) and `C#####` (YouTube) beneficiary IDs.
- There is **no delivery mechanism** — statements reach writers by manual email, or not at all.
- The existing RD frontend demo proves the UX but runs entirely on `localStorage` with hardcoded personas and no login.

The two data assets (both now delivered and verified) are:

1. **Royalty statements** — the six batch drops in `~/Downloads/wetransfer_h2-2025-and-h1-2026-statements_2026-06-10_1613/`, structure fully verified (see ingestion PRD §2).
2. **The client list** — `~/Downloads/Client List for Verax.xlsx`: 810 clients + 78 commission partners with contact emails and language preferences, the missing link between statement accounts and real humans who can log in (verified structure in §3.2).

This PRD specifies the infrastructure that turns those two inputs into a running product: writers get portal accounts and see their statements; the publisher's ops team gets an admin dashboard to run every period's cycle.

---

## 2. Objectives

1. **One system of record.** Every statement file, parsed line, writer, account mapping, validation finding, and distribution lives in one Postgres database with immutable file storage beside it.
2. **Real identity.** Writers are first-class users with authenticated portal access, provisioned from the client list via an invite flow — no personas, no shared logins.
3. **Deterministic provisioning.** Importing the client list is idempotent and auditable, exactly like statement ingestion: re-import the same list, nothing changes; import a corrected list, deltas are surfaced for review.
4. **Tenant-safe by construction.** A writer can only ever read their own data; the query layer enforces this, not the frontend.
5. **Operable by one person.** Deploys, backups, migrations, and monitoring must be simple enough for a solo operator to run confidently.

### Non-goals (this phase)

- Royalty calculation or money movement (upstream, external — confirmed scope).
- Multi-publisher SaaS. The schema keeps `publisher_id` on everything so white-labeling stays possible, but this phase ships **one** publisher tenant (Regalias Digitales).
- Writer-initiated disputes, messaging, tax-form collection.
- Native mobile apps (the existing APNs/push scaffolding stays dormant).
- Payment/payout integrations.

---

## 3. Input data contracts

The platform is seeded from two inputs. Both get formal contracts so a bad file fails loudly at import, never silently downstream.

### 3.1 Input A — Royalty statement batches (verified)

Already fully specified in the ingestion PRD §2. Summary of what infrastructure must support:

- Drops of **PDF + XLSX pairs**, ~2,612 statements / 2 GB per semiannual cycle, named `Ben_PUB<YY><H#|Q#>_<BeneficiaryID> - <Name> (<Type>).{pdf,xlsx}`.
- Beneficiary ID is the join key (`JN####`, `C#####`, `CS####`, `CSJ###`, `CPJ###`, lowercase sub-account suffixes). Names drift and are never keys.
- Counts diverge, folder names lie, house accounts exist (`CS0001`, `CPJ001`), special quarterly accounts overlap semiannual batches (`C00139*` Luna Negra family).
- Core invariant: `Σ(XLSX line Earnings) == PDF "Royalties calculated"` (held for 2,609/2,611 in the reference drop).

**Infrastructure consequences:** object storage must handle ~4–5 GB/year of immutable files with sha256 addressing; the DB must hold ~2,600 statements + on the order of 10⁵–10⁶ statement lines per cycle; ingestion must run as a background job, not a request handler.

### 3.2 Input B — The client list (verified 2026-07-06: `Client List for Verax.xlsx`)

The delivered file has **two sheets, same 7 columns**, and its actual structure differs from what was assumed in earlier drafts in two ways that reshape the design (see consequences below):

| Sheet | Rows | Maps to |
|---|---:|---|
| `Client List` | 810 | Writers/publishers — the `JN####` (mechanical) and `C#####` (YouTube) account population |
| `Commission Partner List` | 78 | Commission partners — the `CS####`/`CSJ###` account population (names line up with the CS/CSJ statement files: Ali Telez, Angie Martinez, B-Legit, …) |

**Columns (verified fill rates on the Client List sheet):**

| Column | Fill | Maps to |
|---|---|---|
| `Artist / Publisher Name` | 810/810 | `Writer.canonical_name` (+ parenthetical group hints — "(Loudness Music)", "(Jaguares)" — become `WriterAlias`/group metadata) |
| `Contact Email` | 810/810 | **One or more** comma-separated emails → `contact` records (see below) |
| `Contact Name` | 809/810 | Contact display names, comma-separated, parallel to emails |
| `Payee Name` | 808/810 | Legal payee — best key for matching statement display names |
| `Admin Type (YT Only / MLC Only / both)` | 810/810 | `Writer.expected_catalogs` — values: `MLC, YT` (488), `YT` (232), `MLC` (89), plus one anomalous `ST, YT` → import finding |
| `Preferred Language (EN/ES)` | 809/810 | New `Writer.preferred_language` — drives invite-email language and portal locale |
| `Quarterly Client?` | 20/810 | `Writer.cadence` = quarterly (matches the ~21–24 quarterly special accounts; 2 commission partners are "Both") |

**Verified realities that change the design:**

1. **No beneficiary IDs anywhere in the file** (0 cells match the `JN####`/`C#####`/`CS*` pattern). The risk flagged in §15.1 has materialized: the client list joins to statements **by name only**. Entity resolution = fuzzy match `Payee Name`/`Artist / Publisher Name` ↔ statement display names, human-confirmed in the resolution queue, persisted forever after first confirmation. Budget real admin time for the first pass (~900 rows ↔ ~1,400 accounts).
2. **Emails are shared and multiple.** 132 emails appear on more than one row (a manager or law firm represents many clients — e.g., one attorney email covers Tony Herrera, Just In Time, Amilcar Boscan, Canserbero; the Loudness Music manager email covers the whole `*(Loudness Music)*` family). And each row can carry several emails. Therefore **login identity ≠ writer**: a portal user (one email) is a *contact* who is granted access to one or more writers, and a writer can have several contacts.

**Import validation rules (same severity model as statement validation):**

- `C-BAD-EMAIL` (error): an email that fails RFC parsing after splitting the comma list.
- `C-BAD-CATALOG` (warn): `Admin Type` outside {MLC, YT, both} — catches the `ST, YT` row.
- `C-NAME-DUP` (warn): two rows with the same normalized `Payee Name` — possible duplicate row vs legitimate distinct entities.
- `C-UNMATCHED-ROW` (warn): a client-list row whose name matches no statement account after auto-matching — goes to the resolution queue.
- `C-UNLISTED-ACCOUNT` (warn): a non-house statement account matched by no client-list row — earning money with no roster entry; also queued.
- `C-HOUSE-COLLISION` (error): a row auto-matches a known house account (`CS0001`, `CPJ001`).
- `C-NO-EMAIL` (info): row without a usable email; writer exists but cannot be invited.

**Idempotency:** the importer computes a diff against current DB state (new writers / changed emails / contact changes / catalog & cadence flips) and shows it for admin confirmation before applying. Re-importing an identical file is a no-op. Every applied import records who/when/what-changed.

---

## 4. System architecture

```
                    ┌─────────────────────────────────────────────┐
                    │                 React SPA (RD)              │
                    │  /admin/*  admin dashboard   (role: admin)  │
                    │  /earnings, /statements  writer portal      │
                    └───────────────┬─────────────────────────────┘
                                    │ HTTPS + JWT (Bearer)
                    ┌───────────────▼─────────────────────────────┐
                    │            FastAPI (verax_backend)          │
                    │  routers: auth, statements_admin, writers,  │
                    │  clients_import, me (writer-scoped)         │
                    │  middleware: rate-limit, lockout, RBAC      │
                    └────┬───────────────┬──────────────┬─────────┘
                         │               │              │
              ┌──────────▼───┐   ┌───────▼──────┐  ┌────▼─────────────┐
              │  PostgreSQL  │   │ Object store │  │ Background worker │
              │  (system of  │   │ (S3/R2, sha- │  │ (DB-polled jobs:  │
              │   record)    │   │  addressed,  │  │  ingest, validate,│
              │              │   │  immutable)  │  │  distribute,      │
              └──────────────┘   └──────────────┘  │  client-import,   │
                                                   │  invite emails)   │
                                                   └───────────────────┘
```

**Key decisions:**

- **One backend, two frontend surfaces.** Admin dashboard and writer portal are the same React app (`verax_frontend RD`) with route-level role guards, served as a static build. No separate apps to deploy.
- **Postgres, not SQLite.** The repo currently carries several SQLite files (`verax.db`, `app.db`, `tunescan*.db`) — dev-only artifacts. Production is a single managed Postgres. SQLAlchemy models already target this; Alembic (already in `migrations/`) owns schema evolution.
- **Object storage is content-addressed and append-only.** `statement_ingest/storage.py` already hashes files; production points it at S3-compatible storage (AWS S3 or Cloudflare R2). Nothing is ever overwritten; supersession is a new object + a DB pointer.
- **The worker is a second process of the same codebase**, polling a jobs table (pattern already scaffolded in `statement_ingest/worker.py`). No Redis/Celery until job volume demands it — a 2,612-statement ingest is minutes of work a few times a year.
- **No server-side rendering, no websockets.** Progress UIs poll (`GET /admin/batches/{id}` returns counts); acceptable at this scale and radically simpler to operate.

---

## 5. Data layer

### 5.1 Schema (extends what exists in `app/models/statements.py`)

Existing and kept as-is: `Publisher`, `Writer`, `WriterAlias`, `BeneficiaryAccount`, `StatementUpload`, `StatementBatch`, `Statement`, `StatementLine`, `ValidationRun`, `ValidationFinding`.

**Additions this PRD introduces:**

- `Writer` — add `kind` (`client | commission_partner`, from the source sheet), `preferred_language` (`en|es`), `cadence` already exists; keep `contact_email`/`portal_user_id` for the simple 1:1 case but treat `writer_contact` as the source of truth.
- `contact` — id, email (unique), display_name, user_id (nullable until invite accepted). A contact is a human who logs in — writer, manager, or attorney. **Verified need:** 132 emails on the client list represent more than one client.
- `writer_contact` — writer_id, contact_id, role (`primary|manager|legal|other`). A contact sees the union of statements for all writers they're linked to; the portal shows a writer switcher when >1.
- `client_import` — id, publisher_id, filename, sha256, uploaded_by, uploaded_at, status (`pending_review|applied|rejected`), diff JSON (writers/contacts added/changed/removed), applied_at, applied_by.
- `portal_invite` — id, contact_id, email, token_hash, sent_at, expires_at, accepted_at, revoked_at. One active invite per contact; invite email localized per the writer's `preferred_language`.
- `distribution` — id, statement_id, writer_id, batch_id, published_at, published_by, portal_visible bool, superseded_by nullable, gate_snapshot JSON. (Defined in the ingestion PRD; owned here as a table.)
- `job` — id, kind (`ingest_batch|validate_batch|distribute_batch|client_import|send_invites`), payload JSON, status (`queued|running|done|failed`), attempts, last_error, created_at, started_at, finished_at. The worker's queue.
- `audit_log` — id, actor_user_id, action, entity_type, entity_id, detail JSON, created_at. Append-only; written for every admin mutation (waive, resolve, distribute, unpublish, import-apply, invite, role change).

**Role model:** reuse the existing `User` table (`app/models/models.py`) rather than a parallel identity system. Add a `role` enum (`admin | writer`) if not derivable from existing fields; `Writer.portal_user_id → User.id` links roster to login. Admin users are created manually (there will be ~2–5).

### 5.2 Migration & environment policy

- **Alembic is the only way schema changes ship.** Autogenerate + hand-review; every migration reversible or explicitly marked not.
- Dev runs Postgres in Docker (`docker-compose.yml` at repo root: postgres + backend + worker). SQLite files are deleted from the repo and gitignored.
- **Backups:** managed-Postgres automated daily snapshots, 30-day retention, plus a weekly `pg_dump` to the object store. Restore is rehearsed once before launch (see §12 acceptance).

### 5.3 Scale envelope (sizing, not premature optimization)

| Dimension | Per cycle | 3-year horizon |
|---|---|---|
| Statements | ~2,600 | ~20k rows |
| Statement lines | ~10⁵–10⁶ | ~10⁶–10⁷ rows |
| Files in object store | ~5,200 (2 GB) | ~15 GB |
| Writers / users | ~1,300 | ~2,000 |
| Concurrent users | admin team (≤5) + writer long tail | ≤50 concurrent |

Everything fits comfortably in the smallest managed-Postgres tier with indexes on `(statement.batch_id)`, `(statement.account → beneficiary_account.account_code)`, `(statement_line.statement_id)`, `(distribution.writer_id, portal_visible)`. No sharding, no read replicas, no caching layer.

---

## 6. File storage

- **Provider:** S3-compatible (recommendation: Cloudflare R2 — zero egress fees matter because every writer PDF download is egress; S3 acceptable).
- **Layout:** `statements/{sha256[:2]}/{sha256}` — content-addressed, original filename kept only as DB metadata. Client-list uploads under `imports/{sha256}`.
- **Immutability:** bucket policy denies overwrite/delete from the app credential; deletions require the operator credential. Supersession is a new hash.
- **Writer downloads are signed URLs** minted per-request by `GET /me/statements/{id}/pdf` with a short TTL (15 min), only after the ownership check passes. The bucket is never public.
- **Dev fallback:** local-filesystem driver (already how `storage.py` works) selected by env var, same interface.

---

## 7. Identity, auth, and provisioning

### 7.1 Auth mechanics (reuse, don't rebuild)

`app/routers/auth.py` already provides JWT issuance (jose), bcrypt hashing (passlib), login/signup/reset rate limiting, account lockout middleware, and signed email-verification tokens (itsdangerous). Changes required:

1. **Close open signup.** The portal is invite-only. `POST /signup` is disabled (or admin-gated); accounts come into existence only through the invite flow.
2. **Add `role` to the JWT claims** and a FastAPI dependency pair: `require_admin` (guards every `/admin/*` route) and `current_contact` (resolves JWT → User → contact → linked writers, 403 if unlinked).
3. **Token policy:** access token 24 h (matches existing), no refresh tokens this phase; re-login is acceptable for a statements portal. Password reset flow already exists — keep.
4. **MFA for admin accounts only** (TOTP) is a fast-follow, not launch-blocking; admin accounts get strong passwords + lockout at launch.

### 7.2 Provisioning flow — Dropbox-style access sharing

Access to a writer works like sharing a Dropbox folder: the **writer is the folder**, a `writer_contact` link is **membership**, and a `portal_invite` is a **pending share**. The admin sends the *first* invite to bootstrap each writer; after that, anyone with access can invite additional emails from their own Settings — no admin round-trip. (Refined 2026-07-06 from the earlier admin-only push model.)

```
                 ADMIN BOOTSTRAP                     SELF-SERVE SHARE
client list ──▶ Writer (name-matched,           logged-in contact
                admin-confirmed accounts)         │  Settings → "invite by email"
       │                                          ▼
       └─ admin: POST /admin/writers/{id}/invites │  POST /me/writers/{id}/invites
                        │                          │  (must already have access)
                        ▼                          ▼
                 portal_invite (single-use hashed token, 14-day expiry,
                                localized EN/ES email — delivery deferred,
                                link returned to the UI for now)
                        │  recipient opens /portal/invites/{token}, accepts
                        ▼
                 POST /portal/accept-invite {token, password?}
                   → find/create Contact + User, link writer_contact, mint session
                        ▼
                 Contact logs in → sees the union of portal_visible
                 distributions across all linked writers (switcher when >1)
```

Rules:

- One invite grants one email access to one writer. Tokens are single-use; creating a new invite for the same (writer, email) revokes the prior one.
- Inviting an email that **already** has access is a no-op conflict (409), not a duplicate share.
- **A writer must not be invitable until its beneficiary-account matching is admin-confirmed** — otherwise a contact logs in to nothing, or the wrong earnings. Gate invites on resolution state.
- A non-member asking about a writer gets **404, not 403** — existence is hidden.
- A writer whose `status` flips to `exited` keeps read access to already-distributed periods; the admin can hard-disable the login if required. Default: keep access.
- **No contact ever sees a writer they aren't linked to.** No shared lists, no leaderboards, no aggregate endpoints on the portal side.

> **Build status (2026-07-06):** built and tested. `portal_invite` table (migration `r3s4t5u6v7w8`), invite service (`app/services/portal/invites.py`: create/preview/accept/revoke, single-use sha256 tokens), and the API (`app/routers/portal.py`): admin bootstrap `POST/GET /admin/writers/{id}/invites`; self-serve `/me` surface (`GET /me`, `/me/writers`, `/me/writers/{id}/members`, `POST /me/writers/{id}/invites`, `POST /me/invites/{id}/revoke`); public `GET /portal/invites/{token}` + `POST /portal/accept-invite` (creates login, mints JWT via the existing auth stack). `current_contact` dependency + explicit writer-access checks enforce §7.3 tenancy. **Deferred:** actual email delivery (link is returned in the API response meanwhile), and the `/me/statements` earnings-read endpoints.

### 7.3 Tenancy enforcement

Every portal-facing query is written against a single scoped helper (`for_contact(user)`) that joins User → `contact` → `writer_contact` — never a raw `writer_id` from the request; a `writer_id` query param is only ever an *additional filter within* that scope (for the writer switcher). Admin routes are physically separate routers with the `require_admin` dependency at router level, not per-endpoint. A test suite item asserts: for every registered route, either it's under the admin router or its handler uses the contact scope (a route audit test, run in CI).

---

## 8. Services & background jobs

The worker polls the `job` table (existing pattern). Job kinds:

| Job | Trigger | What it does |
|---|---|---|
| `ingest_batch` | admin uploads zip / points at folder | unpack → hash → parse → pair → stage (ingestion PRD Stage A) |
| `validate_batch` | auto after ingest; re-runnable | rules engine → findings (Stage B) |
| `client_import` | admin uploads client list | parse → validate (§3.2 rules) → diff → `pending_review` |
| `apply_client_import` | admin confirms diff | apply writer/account/alias changes atomically |
| `send_invites` | admin selects writers → Invite | create tokens, send email per writer, record `sent_at` |
| `distribute_batch` | admin clicks Distribute (gate green) | create distributions, flip visibility (Stage C) |

Job properties: single-attempt visibility (a `running` job with a dead worker is re-queued after a timeout), `last_error` stored verbatim, failed jobs surfaced in the admin UI, and every job idempotent by design (re-running an ingest of identical hashes is a no-op — already the pipeline's contract).

**Email:** the existing `app/emails` client is used for invites and password resets only this phase (transactional provider: Resend or Postmark; SPF/DKIM configured on the sending domain). Statement-published notifications remain deferred per the ingestion PRD, but `distribution` rows make backfill trivial.

---

## 9. Frontend surfaces (mapping to existing RD screens)

The RD app already contains the right screens; the infrastructure work is replacing `localStorage`/persona state with the real API.

### Admin dashboard (role: admin)

| Screen (exists in `src/pages/`) | Backed by |
|---|---|
| `AdminOverview` | period status rollup: batches, gate states, distribution progress, invite coverage (% of active writers with activated accounts) |
| `AdminStatements`, `AdminStatementUpload`, `AdminStatementDetail` | batches list/upload/detail + findings + waive/resolve + gate (ingestion PRD §6–7) |
| `AdminWriters`, `AdminWriterDetail` | roster CRUD, account mappings, alias list, invite status + actions, entity-resolution queue |
| **New:** Client-list import screen | upload → validation findings → diff review → apply |
| `AdminDistributions`, `AdminDistributionDetail` | distribute pre-flight, per-writer results, unpublish |
| `PersonaSwitch` → becomes **Preview as writer** | admin-only impersonation: read-only writer view, banner + exit pill, `audit_log` entry on entry/exit, never a real writer JWT |

### Writer portal (role: writer)

- `Login`, `ForgotPassword`, `ResetPassword`, invite-accept (new page, reuses SignUp form shell) — real auth against `/auth`.
- `/earnings` (Revenue page): gated exactly as the demo PRD specified — empty state until first distribution; then period chips, totals, by-source, by-territory, top works, all served from `GET /me/statements` + `/me/statements/{id}/breakdown`.
- **Writer switcher** for multi-writer contacts (managers/attorneys — verified common in the client list); single-writer contacts never see it.
- Statements list with per-period payable + signed PDF download.
- **Spanish localization**: `Preferred Language (EN/ES)` is a per-row column in the client list with heavy ES usage — invite + auth emails must ship localized in Phase 1; portal UI i18n (EN/ES) is required by Phase 3 launch, not a fast-follow.
- `Settings`: password change and language preference only this phase.

Frontend infra changes: an API client with the JWT interceptor, environment-based API base URL (`REACT_APP_API_URL`), removal of `rd_distribution_state_v1` localStorage layer and the persona auto-injection in UserContext (kept only behind a dev flag for local demo mode).

---

## 10. API surface (delta over the ingestion PRD §7)

The ingestion PRD's endpoints stand. Added by this PRD:

Endpoints marked ✅ are built and tested; unmarked ones are planned. Two deviations from the original draft, both deliberate: client-import runs **synchronously** (upload computes the diff inline) rather than via the `job` queue in §8 — fine for an ~888-row parse a few times a year; and provisioning follows the **Dropbox-style share** model (§7.2), so invites are writer-scoped (`/me/writers/{id}/invites`, `/admin/writers/{id}/invites`) rather than contact-scoped `/admin/contacts/{id}/invite`. The `/reject` client-import endpoint was dropped in favor of leaving unreviewed imports `pending_review`.

```
# Client list  (sync, not job-queued)
POST   /admin/client-imports              # upload → compute findings + diff  ✅
GET    /admin/client-imports/{id}         # findings + diff for review          ✅
POST   /admin/client-imports/{id}/apply   # apply exact matches (hash-guarded)  ✅
GET    /admin/client-imports/{id}/queue   # probable / unmatched / unlisted     ✅
POST   /admin/client-imports/{id}/resolve # attach admin-chosen accounts to a row ✅

# Provisioning — Dropbox-style sharing (§7.2)
POST   /admin/writers/{id}/invites        # admin bootstrap invite              ✅
GET    /admin/writers/{id}/invites        # invites on a writer                 ✅
POST   /me/writers/{id}/invites           # self-serve share (from Settings)    ✅
POST   /me/invites/{id}/revoke            # revoke a share                      ✅
GET    /portal/invites/{token}            # preview an invite (public)          ✅
POST   /portal/accept-invite              # {token, password?} → login + JWT    ✅
GET    /admin/invites?status=…            # coverage dashboard (planned)

# Portal read (contact-scoped, §7.3)
GET    /me                                # profile + accessible writers        ✅
GET    /me/writers                        # writers I can access                ✅
GET    /me/writers/{id}/members           # share panel: members + pending      ✅
GET    /me/statements                     # portal_visible distributions (planned — needs Phase 2)
GET    /me/statements/{id}/pdf            # signed download (planned)
GET    /me/statements/{id}/breakdown      # earnings breakdown (planned)

# Impersonation / Ops (planned)
POST   /admin/writers/{id}/preview-token  # read-only writer-view token (audited)
GET    /admin/jobs?status=failed          # job visibility
GET    /healthz                           # liveness (DB ping)
```

All admin endpoints: `require_admin`. All `/me/*`: writer scope (§7.3). Rate limits already exist on auth endpoints; add a modest global per-IP limit at the proxy.

---

## 11. Deployment, environments, and operations

### 11.1 Environments

| Env | Purpose | Data |
|---|---|---|
| **dev** | local docker-compose (postgres + backend + worker + CRA dev server) | synthetic fixtures + anonymized sample statements |
| **staging** | one small instance, same topology as prod | full reference drop + real client list — the backfill rehearsal happens here |
| **prod** | managed | real |

### 11.2 Hosting (recommendation)

- **Backend + worker:** two processes of one Docker image on a PaaS (Railway / Render / Fly.io — pick one; Railway recommended for solo-operator ergonomics). Vertical scaling only.
- **Postgres:** the platform's managed Postgres (or Neon/Supabase-as-Postgres). Daily snapshots on.
- **Frontend:** static build on Cloudflare Pages (or the same PaaS's static hosting), `/api` proxied to the backend under one domain to avoid CORS entirely.
- **Object storage:** Cloudflare R2 (§6).
- **DNS/TLS:** Cloudflare in front of everything; TLS terminated at the edge; backend only accepts traffic from the proxy.

### 11.3 Configuration & secrets

- All config via env vars through the existing `app/settings/settings.py` (pydantic settings). **Zero secrets in the repo.** Audit result (2026-07-06): nothing sensitive is tracked in git — no `.env`, `.pem`, `.key`, or `.db` in history. `docusign_private_key.pem` sits in `verax_backend/` but was **untracked** (never committed); it is now covered by `.gitignore` (`*.pem`/`*.key` added) so it can't be committed by accident. Because it never entered git, no history rewrite is needed and rotation is precautionary, not urgent.
- Secrets live in the PaaS secret store. `SECRET_KEY` (JWT) rotated on launch since it's been in dev use.
- A `.env.example` documents every variable; the app fails fast at boot on missing required config.

### 11.4 CI/CD

- GitHub Actions: on PR → lint (ruff), type-check where typed, backend tests (pytest, includes the route-audit tenancy test §7.3 and parser fixtures), frontend tests + build.
- On merge to `main` → deploy staging automatically; prod deploy is a manual promote (one click).
- Alembic migrations run as a release step before the new code serves traffic.

### 11.5 Observability

- **Errors:** Sentry on backend and frontend (free tier is fine).
- **Logs:** structured JSON via existing `app/logger`, retained by the PaaS; every job logs start/end/counts.
- **Uptime:** external ping on `/healthz` (UptimeRobot or the PaaS's own).
- **The audit_log table is the business-level trail**; Sentry/logs are the technical one. Don't conflate them.

### 11.6 Repo hygiene (prerequisite work)

The working tree currently contains `verax_backend copy/`, stray `.mp4`/`.V22` files, multiple SQLite DBs, `venv/`, `logs/`, and `uploads/` inside the backend. Before infrastructure work starts: delete the copy dir, gitignore runtime artifacts, purge committed secrets/history, and make `verax_backend` + `verax_frontend RD` the only two live roots (decide the fate of `verax_frontend` (old) and `pro_audit_tool` — archive or extract).

---

## 12. Security & compliance

- **PII inventory:** writer name, email, phone, country, manager email, earnings data. All of it lives only in Postgres + audit log; statements PDFs contain earnings and address data — hence private bucket + signed URLs only.
- **Access control:** RBAC (§7), route-audit test in CI, impersonation always audited and read-only.
- **Transport:** TLS everywhere; HSTS at the edge.
- **At rest:** managed-Postgres encryption + R2 default encryption (both on by default).
- **Uploads:** zip-bomb guard (size + entry-count limits on batch upload), content-type sniffing on client-list files, no execution of anything uploaded.
- **Auth hardening already present:** bcrypt, login rate limit, lockout, signed reset tokens. Add: invite tokens stored hashed (like passwords), single-use.
- **Data deletion:** an exited writer's PII can be scrubbed on request (name → redacted, email nulled) without touching statement/distribution records (financial records of the publisher, retained).
- **Backups tested:** restore drill on staging before launch is an acceptance criterion.

---

## 13. Phasing

**Phase 0 — Foundations (repo + platform)**
Repo hygiene (§11.6), docker-compose dev env, Postgres migration + Alembic baseline, object-store driver, CI pipeline, staging environment stood up.
*Done when:* the existing ingestion pipeline runs end-to-end on staging against Postgres + R2 with the reference drop.

**Phase 1 — Identity & client list**
Role model, `require_admin`/contact-scope dependencies, contact + writer_contact schema, client-list importer (both sheets) + diff-review UI, name-matching resolution queue seeded from the six ingested batches, localized invite flow (tokens, EN/ES email, accept page), `AdminWriters` wired to real API.
*Done when:* both sheets of `Client List for Verax.xlsx` import cleanly (all findings triaged), a meaningful share of rows are auto-matched to statement accounts with the rest queued, and a test contact can accept an invite, log in, and see the empty portal state.

> **Build status (2026-07-06):** the backend half is built and tested. `contact` / `writer_contact` / `client_import` tables + `Writer.kind/payee_name/preferred_language` shipped in Alembic migration `q2r3s4t5u6v7`. `app/services/client_import/` (parser → matcher → validator → importer) parses both sheets, name-matches to the account population, emits the C-* findings, and applies exact matches by re-pointing accounts to the resolved client Writer and merging placeholder writers. Admin API live at `/admin/client-imports` (upload→preview, apply with sha256 guard). 168 backend tests pass. Verified on the real file: 817/888 rows exact-match, 1,212/1,297 non-house accounts covered; RedZed's `JN0232`+`C00616` correctly merge into one identity. **Remaining for Phase 1:** admin-confirm UI for the probable/unmatched resolution queue, the localized invite + accept-password flow, and `contact`-scoped `/me/*` portal endpoints.

**Phase 2 — Pipeline on the platform**
Ingestion PRD Phases 1–3 running as jobs on this infrastructure: batch upload UI → worker ingest → validation findings UI → gate → distribute. Backfill the six reference batches on staging in chronological order.
*Done when:* the gate goes green on staging for all six batches with expected findings triaged, and distributions exist.

> **Build status (2026-07-06):** the distribution backend is built and tested. `distribution` table (migration `s4t5u6v7w8x9`). `app/services/distribution/`: `gate.compute_gate` (ready only when zero open blockers AND every non-house statement is parsed + entity-resolved; house excluded), `publish.distribute_batch` (enforces the gate, idempotent, supersede-on-reingest, and cadence de-dup so a writer sees each period once — semiannual supersedes the quarterly it covers), and `unpublish` (reversible). API: `GET /admin/statements/batches/{id}/gate`, `POST .../distribute` (409 + gate state when not green), `POST /admin/distributions/{id}/unpublish`, and contact-scoped `GET /me/statements` + `/me/statements/{id}`. Verified end-to-end over HTTP: gate → distribute → the linked contact sees exactly one statement, a stranger gets 404, unpublish hides it. The writer read side is complete: `GET /me/statements/{id}/pdf` (scoped file stream — becomes a signed URL when object storage lands) and `GET /me/statements/{id}/breakdown` (earnings by income type / source / country / channel, aggregated from `statement_line`). **Remaining:** run ingest→gate→distribute jobs on the worker (currently inline/synchronous), and all frontend UI (admin gate/distribute, writer portal).

**Phase 3 — Writer portal live**
`/earnings` + statements list + signed PDF downloads on real data; impersonation preview; production cutover; invite the first cohort (start with ~10 friendly writers, then bulk).
*Done when:* a real writer downloads their real H2 2025 PDF from production.

**Phase 4 — Hardening & fast-follows**
Admin TOTP, statement-published email notifications (backfilled from `distribution` rows), restore drill cadence, error-budget review.

---

## 14. Success metrics

- **Provisioning coverage:** ≥ 90% of active writers with a valid email have activated portal accounts within 30 days of invite.
- **Cycle time:** WeTransfer drop → all writers' portals updated in ≤ 2 working days (vs. weeks of manual email today).
- **Integrity:** zero mis-attributed statements (a statement visible to the wrong writer) — measured by audit; this metric's tolerance is exactly 0.
- **Reconciliation:** V-STMT-RECON pass rate on real drops stays ≥ 99.9% (parity with the verified reference drop).
- **Ops load:** a full period cycle (ingest → verify → distribute → invites for new writers) executable by one admin in one sitting.

---

## 15. Risks & open questions

1. **Name-only matching (confirmed).** The delivered client list contains zero beneficiary IDs, so the entire client-list ↔ statement-account join is fuzzy name matching (~900 rows ↔ ~1,400 accounts), human-confirmed once and persisted. Mitigations: match on `Payee Name` *and* `Artist / Publisher Name` against both filename display names and prior-period rosters; use the group parentheticals ("(Loudness Music)", "(Luna Negra)") to bulk-match families; sheet membership disambiguates CS/CSJ commission accounts; gate invites on confirmed matches (§7.2). Ask upstream to add the account codes to the next revision of the list — it converts this from fuzzy to exact forever.
2. **Email deliverability for ~1,300 invites** — a cold domain bulk-sending invites can get flagged. Mitigation: transactional provider with domain warm-up, staggered invite batches, SPF/DKIM/DMARC before the first send.
3. **Secrets hygiene** — audited 2026-07-06: nothing sensitive is tracked in git; `docusign_private_key.pem` was untracked and is now gitignored (§11.3), so this is resolved, not a blocker. Still do on launch: rotate the dev `SECRET_KEY` (JWT) and move all secrets into the PaaS store.
4. **The old `verax_frontend` and `pro_audit_tool`** share the backend — changes to auth/roles could break them. Decision needed: are they in scope to keep working, or frozen? (Recommendation: freeze; this platform is the product.)
5. **Open:** who besides Steven gets admin accounts, and does the publisher's own ops team get access at launch (affects white-label/branding priority)?
6. **Open:** legal/retention requirements for statements in the operating jurisdictions (ES/US) — affects the deletion policy in §12.
7. **Open:** custom domain + branding for the portal (writers should see the publisher's brand, not "Verax"?) — decide before invites go out; changing the login URL after 1,300 invites is painful.
