import { MOCK_WRITERS, SEED_WRITERS } from './roster';
import { getEarningsForClient, getTotalUsages, getWorksCount, recordWriterEarnings } from './earningsData';

// ───────────────────────────────────────────────────────────────────────────
// Mock distribution store
//   Tracks per-writer pending (uploaded but not yet distributed) royalties,
//   validation issues, and last-distributed timestamps. Everything lives in
//   module state — survives navigation, resets on full reload.
// ───────────────────────────────────────────────────────────────────────────

// Validation seeds per writer — mirror what the publisher would actually flag
// Each writer is expected to receive ONE statement file per type per half-year.
// A writer is "ready to distribute" only when ALL required types have been
// uploaded for the current period.
export const REQUIRED_STATEMENT_TYPES = ['Mechanical Royalties', 'YouTube Publishing'];

export const CURRENT_PERIOD = 'H2 2025';

// Per-writer × per-period receipt log.
// Each statement TYPE (Mechanical, YouTube) has its own XLSX line-item detail
// file (this carries the money). There is ONE master Summary PDF per writer per
// period — the payment-of-record document that summarizes across all types — so
// the PDF is tracked as a single field, not one-per-type.
//   key = `${period}|${writerId}` → { xlsx: { [type]: bool }, summaryPdf: bool }
const _key = (period, writerId) => `${period}|${writerId}`;
const receivedByWriter = new Map();

// ── Receipt value helpers (inner value: { xlsx: {[type]:bool}, summaryPdf }) ──
const emptyReceipt = () => ({ xlsx: {}, summaryPdf: false });
const receiptHasAny = (rec) => !!rec && (rec.summaryPdf || Object.values(rec.xlsx || {}).some(Boolean));
// Accept the current shape, the prior per-type {xlsx,pdf} pairs, or the oldest
// array-of-type-strings. Never regress a previously-complete demo writer.
export const normalizeReceipt = (raw) => {
  const rec = emptyReceipt();
  if (Array.isArray(raw)) {
    for (const t of raw) rec.xlsx[t] = true;
    if (raw.length) rec.summaryPdf = true;
  } else if (raw && typeof raw === 'object') {
    if (raw.xlsx && typeof raw.xlsx === 'object' && Object.prototype.hasOwnProperty.call(raw, 'summaryPdf')) {
      for (const [t, v] of Object.entries(raw.xlsx)) rec.xlsx[t] = !!v;
      rec.summaryPdf = !!raw.summaryPdf;
    } else {
      // prior per-type pair shape { [type]: {xlsx, pdf} } — collapse every
      // per-type pdf into the single summary PDF.
      for (const [t, v] of Object.entries(raw)) {
        if (v && typeof v === 'object') {
          if (v.xlsx) rec.xlsx[t] = true;
          if (v.pdf) rec.summaryPdf = true;
        } else {
          rec.xlsx[t] = true;
          rec.summaryPdf = true;
        }
      }
    }
  }
  return rec;
};

// Seed so the demo opens mid-cycle: some writers complete, others awaiting.
// A complete writer has every required XLSX plus the summary PDF.
[
  ['-1', ['Mechanical Royalties', 'YouTube Publishing']], // Demo Writer
  ['-2', ['Mechanical Royalties', 'Performance Royalties', 'YouTube Publishing', 'Synchronization']], // Ava — complete
  ['-3', ['Mechanical Royalties']], // M. Okonkwo — only 1 type
  ['-4', ['Mechanical Royalties', 'Performance Royalties', 'YouTube Publishing']], // Vine Sessions
  ['-5', ['Mechanical Royalties', 'YouTube Publishing']], // RedZed — the two real files we have
].forEach(([writerId, types]) => {
  const rec = emptyReceipt();
  for (const t of types) rec.xlsx[t] = true;
  rec.summaryPdf = true;
  receivedByWriter.set(_key(CURRENT_PERIOD, writerId), rec);
});

// Pending royalty for the writer = the slice of the 12-month earnings series
// that corresponds to CURRENT_PERIOD. We model the year as:
//   index 0    = Jun (tail of H1 2025)
//   indices 1..6 = Jul–Dec  (H2 2025)
//   indices 7..11 = Jan–May (H1 2026 accrual)
const computePending = (writerId) => {
  const data = getEarningsForClient(writerId);
  if (!data) return 0;
  return data.monthly.slice(1, 7).reduce((s, m) => s + m.amount, 0);
};

const computePendingLines = (writerId) => Math.round(computePending(writerId) / 5);

const state = {
  // { writerId: { pending, pendingLines, lastDistributedAt, distributedTotal, distributedPeriods } }
  byWriter: Object.fromEntries(
    MOCK_WRITERS.map((w) => [
      w.id,
      {
        pending: Math.round(computePending(w.id)),
        pendingLines: computePendingLines(w.id),
        lastDistributedAt: null,
        distributedTotal: 0,
        // Set of period keys that have been distributed for this writer.
        // Empty by default — writer portals stay empty until the admin clicks
        // Distribute on their first period. Each distribution adds a chip.
        distributedPeriods: new Set(),
      },
    ])
  ),
  // Append-only log of recent ingests, surfaced on the admin home
  recentUploads: [
    {
      id: 'up-1',
      source: 'BMI',
      period: 'Q4 2025',
      lines: 412,
      matched: 387,
      uploadedAt: '2026-05-03T09:14:00Z',
    },
    {
      id: 'up-2',
      source: 'Spotify',
      period: 'Mar 2026',
      lines: 1842,
      matched: 1798,
      uploadedAt: '2026-04-30T15:22:00Z',
    },
    {
      id: 'up-3',
      source: 'ASCAP',
      period: 'Q4 2025',
      lines: 218,
      matched: 199,
      uploadedAt: '2026-04-22T11:08:00Z',
    },
    {
      id: 'up-4',
      source: 'PRS',
      period: 'Q4 2025',
      lines: 96,
      matched: 92,
      uploadedAt: '2026-04-18T14:00:00Z',
    },
    {
      id: 'up-5',
      source: 'YouTube CMS',
      period: 'Q1 2026',
      lines: 1112,
      matched: 1087,
      uploadedAt: '2026-04-15T08:35:00Z',
    },
  ],
};

// ── Persistence ────────────────────────────────────────────────────────────
// The demo runs entirely in the browser. Persona switches do a full
// `window.location` reload, which would otherwise wipe in-memory state.
// We snapshot the mutable bits to localStorage and rehydrate on module load.
const PERSIST_KEY = 'rd_distribution_state_v1';
// Tombstone list of writer IDs the user has explicitly deleted. Persisted so
// deletions survive reloads, even for originally-seeded writers from roster.js.
const deletedWriterIds = new Set();

const snapshot = () => {
  try {
    const data = {
      byWriter: Object.fromEntries(
        Object.entries(state.byWriter).map(([id, s]) => [
          id,
          {
            pending: s.pending,
            pendingLines: s.pendingLines,
            lastDistributedAt: s.lastDistributedAt,
            distributedTotal: s.distributedTotal,
            distributedPeriods: Array.from(s.distributedPeriods || []),
            distributedAt: s.distributedAt || {},
          },
        ])
      ),
      received: Object.fromEntries(Array.from(receivedByWriter.entries())),
      addedWriters: MOCK_WRITERS.filter((w) => w.id <= -100).map((w) => ({
        id: w.id,
        name: w.name,
        color: w.color,
        catalog: w.catalog || [],
      })),
      nextWriterId: _nextWriterId,
      recentUploads: state.recentUploads,
      deletedWriterIds: Array.from(deletedWriterIds),
    };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
};

const rehydrate = () => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    // Replay any deletions FIRST so the seeded MOCK_WRITERS reflects them.
    if (Array.isArray(data.deletedWriterIds)) {
      for (const id of data.deletedWriterIds) {
        deletedWriterIds.add(id);
        const idx = MOCK_WRITERS.findIndex((w) => w.id === Number(id));
        if (idx !== -1) MOCK_WRITERS.splice(idx, 1);
        delete state.byWriter[Number(id)];
        for (const k of Array.from(receivedByWriter.keys())) {
          if (k.endsWith(`|${id}`)) receivedByWriter.delete(k);
        }
      }
    }
    if (Array.isArray(data.addedWriters)) {
      for (const w of data.addedWriters) {
        if (!MOCK_WRITERS.find((x) => x.id === w.id)) {
          MOCK_WRITERS.push(w);
          state.byWriter[w.id] = {
            pending: 0,
            pendingLines: 0,
            lastDistributedAt: null,
            distributedTotal: 0,
            distributedPeriods: new Set(),
          };
        }
      }
    }
    if (typeof data.nextWriterId === 'number' && data.nextWriterId < _nextWriterId) {
      _nextWriterId = data.nextWriterId;
    }
    if (data.byWriter) {
      for (const [id, s] of Object.entries(data.byWriter)) {
        if (state.byWriter[id]) {
          state.byWriter[id] = {
            ...state.byWriter[id],
            pending: s.pending ?? state.byWriter[id].pending,
            pendingLines: s.pendingLines ?? state.byWriter[id].pendingLines,
            lastDistributedAt: s.lastDistributedAt ?? null,
            distributedTotal: s.distributedTotal ?? 0,
            distributedPeriods: new Set(s.distributedPeriods || []),
            distributedAt: s.distributedAt || {},
          };
        }
      }
    }
    if (data.received) {
      for (const [k, raw] of Object.entries(data.received)) {
        receivedByWriter.set(k, normalizeReceipt(raw));
      }
    }
    if (Array.isArray(data.recentUploads) && data.recentUploads.length) {
      state.recentUploads = data.recentUploads;
    }
  } catch {
    /* noop */
  }
};

const listeners = new Set();
const emit = () => {
  snapshot();
  listeners.forEach((l) => l());
};

export const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// ── Defensive initialization ────────────────────────────────────────────────
// If localStorage gets corrupted and state.byWriter[id] is missing for a valid
// writer, this helper initializes a zero state so read paths don't throw.
const ensureWriterState = (writerId) => {
  const numeric = Number(writerId);
  if (state.byWriter[numeric]) return state.byWriter[numeric];
  // Only initialize if the writer exists in MOCK_WRITERS
  const writer = MOCK_WRITERS.find((w) => w.id === numeric);
  if (!writer) return null;
  state.byWriter[numeric] = {
    pending: 0,
    pendingLines: 0,
    lastDistributedAt: null,
    distributedTotal: 0,
    distributedPeriods: new Set(),
  };
  return state.byWriter[numeric];
};

// Documentation status FOR ONE WRITER for a given period.
export const getDocStatus = (writerId, period = CURRENT_PERIOD) => {
  ensureWriterState(writerId);
  const rec = receivedByWriter.get(_key(period, String(writerId))) || emptyReceipt();
  const items = REQUIRED_STATEMENT_TYPES.map((type) => ({
    source: type, // keep field name for the existing component prop
    xlsx: !!rec.xlsx[type],
    // `received` at the type level == its XLSX detail is in; the summary PDF is
    // tracked once for the whole writer (summaryPdf below), not per type.
    received: !!rec.xlsx[type],
  }));
  const summaryPdf = !!rec.summaryPdf;
  // `missing` names each outstanding item: the per-type XLSX and the one PDF.
  const missing = [];
  for (const it of items) if (!it.xlsx) missing.push(`${it.source} (XLSX)`);
  if (!summaryPdf) missing.push('Summary PDF');
  const allXlsx = items.every((i) => i.xlsx);
  return {
    period,
    items,
    summaryPdf, // the single master summary PDF for the writer/period
    missing,
    missingTypes: items.filter((i) => !i.xlsx).map((i) => i.source),
    missingXlsx: items.filter((i) => !i.xlsx).length,
    missingSummaryPdf: summaryPdf ? 0 : 1,
    receivedCount: items.filter((i) => i.xlsx).length, // XLSX types in
    anyReceived: items.some((i) => i.xlsx) || summaryPdf,
    totalCount: items.length,
    complete: allXlsx && summaryPdf,
  };
};

// Publisher-wide aggregate: how many writers have which statement types in for the period.
export const getRosterDocStatus = (period = CURRENT_PERIOD) => {
  const total = MOCK_WRITERS.length;
  let complete = 0;
  let awaiting = 0;
  for (const w of MOCK_WRITERS) {
    const doc = getDocStatus(w.id, period);
    if (doc.complete) complete += 1;
    else awaiting += 1;
  }
  return { total, complete, awaiting };
};

// True if the system holds any statement data for this writer (any period).
// Derived stats (works, usages) come from static archetype profiles, so they
// must be gated on this — otherwise a writer with no statements (e.g. freshly
// recreated, or after their data was deleted) still shows stale counts.
export const hasAnyStatementData = (writerId) => {
  const suffix = `|${writerId}`;
  for (const [k, rec] of receivedByWriter.entries()) {
    if (k.endsWith(suffix) && receiptHasAny(rec)) return true;
  }
  return false;
};

const writerSummary = (w) => {
  const s = ensureWriterState(w.id) || {
    pending: 0,
    pendingLines: 0,
    lastDistributedAt: null,
    distributedTotal: 0,
    distributedPeriods: new Set(),
  };
  const doc = getDocStatus(w.id, CURRENT_PERIOD);
  const hasData = hasAnyStatementData(w.id);
  return {
    ...w,
    worksCount: hasData ? getWorksCount(w.id) : 0,
    totalUsages: hasData ? getTotalUsages(w.id, 12) : 0,
    pending: s.pending,
    pendingLines: s.pendingLines,
    lastDistributedAt: s.lastDistributedAt,
    distributedTotal: s.distributedTotal,
    docStatus: doc,
    missingSources: doc.missing,
    ready: doc.complete && s.pending > 0,
  };
};

export const getWriterRoster = () => MOCK_WRITERS.map(writerSummary);

export const getWriterDetail = (writerId) => {
  const numeric = Number(writerId);
  ensureWriterState(numeric);
  const w = MOCK_WRITERS.find((x) => x.id === numeric);
  if (!w) return null;
  return writerSummary(w);
};

// ── Roster mutations: add/remove writers at runtime ────────────────────────

const WRITER_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444', '#6366f1'];
let _nextWriterId = -100;
const nextColor = () => WRITER_COLORS[Math.abs(_nextWriterId) % WRITER_COLORS.length];

export const addWriter = ({ name, color } = {}) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  // No duplicates (case-insensitive)
  const existing = MOCK_WRITERS.find((w) => w.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  // Recreating a previously-deleted seeded writer (e.g. re-uploading RedZed's
  // statement files): restore them under their ORIGINAL id so any real-data
  // wiring keyed on that id (RedZed → -5) keeps working.
  const seed = SEED_WRITERS.find((w) => w.name.toLowerCase() === trimmed.toLowerCase());
  if (seed && deletedWriterIds.has(seed.id)) {
    deletedWriterIds.delete(seed.id);
    const restored = {
      ...seed,
      catalog: [...(seed.catalog || [])],
      ...(seed.beneficiaryCodes ? { beneficiaryCodes: [...seed.beneficiaryCodes] } : {}),
    };
    MOCK_WRITERS.push(restored);
    state.byWriter[seed.id] = {
      pending: 0,
      pendingLines: 0,
      lastDistributedAt: null,
      distributedTotal: 0,
      distributedPeriods: new Set(),
    };
    emit();
    return restored;
  }
  const id = _nextWriterId--;
  const writer = { id, name: trimmed, color: color || nextColor(), catalog: [] };
  MOCK_WRITERS.push(writer);
  state.byWriter[id] = {
    pending: 0,
    pendingLines: 0,
    lastDistributedAt: null,
    distributedTotal: 0,
    distributedPeriods: new Set(),
  };
  emit();
  return writer;
};

export const removeWriter = (writerId) => {
  const numeric = Number(writerId);
  const idx = MOCK_WRITERS.findIndex((w) => w.id === numeric);
  if (idx === -1) return false;
  MOCK_WRITERS.splice(idx, 1);
  delete state.byWriter[numeric];
  // Clean per-period receipts for this writer
  for (const k of Array.from(receivedByWriter.keys())) {
    if (k.endsWith(`|${numeric}`)) receivedByWriter.delete(k);
  }
  // Drop this writer's entries from the recent-uploads log
  state.recentUploads = state.recentUploads.filter((u) => Number(u.writerId) !== numeric);
  // Tombstone the deletion so it survives a page reload
  deletedWriterIds.add(numeric);
  emit();
  return true;
};

// kind: 'xlsx' (the type's detail file) | 'pdf' (the writer's summary PDF) |
// 'both'. Default 'both' keeps whole-statement toggles working.
export const markStatementReceived = (writerId, type, kind = 'both', period = CURRENT_PERIOD) => {
  const k = _key(period, String(writerId));
  if (!receivedByWriter.has(k)) receivedByWriter.set(k, emptyReceipt());
  const rec = receivedByWriter.get(k);
  if (kind === 'xlsx' || kind === 'both') rec.xlsx[type] = true;
  if (kind === 'pdf' || kind === 'both') rec.summaryPdf = true;
  emit();
};

export const markStatementMissing = (writerId, type, kind = 'both', period = CURRENT_PERIOD) => {
  const k = _key(period, String(writerId));
  if (!receivedByWriter.has(k)) return;
  const rec = receivedByWriter.get(k);
  if (kind === 'xlsx' || kind === 'both') delete rec.xlsx[type];
  if (kind === 'pdf' || kind === 'both') rec.summaryPdf = false;
  emit();
};

export const distributeWriter = (writerId) => {
  const numeric = Number(writerId);
  const s = ensureWriterState(numeric);
  if (!s) return null;
  if (!getDocStatus(numeric, CURRENT_PERIOD).complete) return null;
  const amount = s.pending;
  s.distributedTotal += amount;
  s.pending = 0;
  s.pendingLines = 0;
  s.lastDistributedAt = new Date().toISOString();
  s.distributedPeriods.add(CURRENT_PERIOD);
  if (!s.distributedAt) s.distributedAt = {};
  s.distributedAt[CURRENT_PERIOD] = s.lastDistributedAt;
  emit();
  return amount;
};

export const distributeAllReady = () => {
  let total = 0;
  let count = 0;
  for (const id of Object.keys(state.byWriter)) {
    if (!getDocStatus(Number(id), CURRENT_PERIOD).complete) continue;
    const s = state.byWriter[id];
    if (s.pending > 0) {
      total += s.pending;
      count += 1;
      s.distributedTotal += s.pending;
      s.pending = 0;
      s.pendingLines = 0;
      s.lastDistributedAt = new Date().toISOString();
      s.distributedPeriods.add(CURRENT_PERIOD);
      if (!s.distributedAt) s.distributedAt = {};
      s.distributedAt[CURRENT_PERIOD] = s.lastDistributedAt;
    }
  }
  emit();
  return { total, count };
};

// Exposed for writer-portal pages: has anything been distributed to this writer yet?
export const hasAnyDistribution = (writerId) => {
  const s = ensureWriterState(writerId);
  return !!s && s.distributedPeriods && s.distributedPeriods.size > 0;
};

export const getDistributedPeriods = (writerId) => {
  const s = ensureWriterState(writerId);
  return s ? Array.from(s.distributedPeriods) : [];
};

// Ordinal for an "H1/H2 YYYY" period so periods sort/compare chronologically.
const periodOrdinal = (p) => {
  const m = /H([12])\s+(\d{4})/.exec(p || '');
  return m ? Number(m[2]) * 2 + Number(m[1]) : 0;
};

// Every reporting half-year to show in a writer's statement history: a full
// H1/H2 grid for each year, from the earliest year that has data through the
// current period's year. Future half-years are included only if they already
// carry data. Sorted newest-first.
export const getWriterPeriods = (writerId) => {
  const suffix = `|${writerId}`;
  const withData = new Set();
  const years = new Set();
  const noteYear = (p) => {
    const m = /(\d{4})/.exec(p);
    if (m) years.add(Number(m[1]));
  };
  for (const [k, rec] of receivedByWriter.entries()) {
    if (k.endsWith(suffix) && receiptHasAny(rec)) {
      const p = k.slice(0, -suffix.length);
      withData.add(p);
      noteYear(p);
    }
  }
  const s = ensureWriterState(writerId);
  if (s && s.distributedPeriods) {
    for (const p of s.distributedPeriods) {
      withData.add(p);
      noteYear(p);
    }
  }
  const curOrd = periodOrdinal(CURRENT_PERIOD);
  const curYear = Number(/(\d{4})/.exec(CURRENT_PERIOD)?.[1]) || new Date().getFullYear();
  years.add(curYear);
  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);
  const out = [];
  for (let y = maxYear; y >= minYear; y--) {
    for (const h of [2, 1]) {
      const p = `H${h} ${y}`;
      // Show every half-year up to the current period; future ones only if
      // they already carry uploaded/distributed data.
      if (periodOrdinal(p) <= curOrd || withData.has(p)) out.push(p);
    }
  }
  return out;
};

// When a given period was distributed to a writer (ISO string), or null.
export const getDistributionDate = (writerId, period) => {
  const s = ensureWriterState(writerId);
  return s && s.distributedAt ? s.distributedAt[period] || null : null;
};

export const getRecentUploads = () => {
  // De-duplicate for display: the same statement (writer + type + period, or
  // source + period for seeded rows) should appear once, keeping the most
  // recent. Guards against duplicate rows persisted before dedup existed.
  const seen = new Set();
  const deduped = [];
  for (const u of state.recentUploads) {
    // Drop uploads whose writer has since been deleted from the roster.
    if (u.writerId != null && !MOCK_WRITERS.some((w) => w.id === Number(u.writerId))) continue;
    const key = u.writerId != null ? `${u.writerId}|${u.statementType}|${u.period}` : `${u.source}|${u.period}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(u);
  }
  return deduped.slice(0, 5);
};

// Called by the upload modal after a successful "ingest". Distributes the
// reported $ across writers in proportion to their current pending amount so
// the numbers reflow plausibly in the UI.
// Called by the upload modal once a file is parsed and assigned to a writer + statement type.
// Marks the (writer, type, period) as received and accumulates pending royalties for that writer.
export const ingestUpload = ({ writerId, statementType, period, lines, matched, totalAmount, source, fileKind }) => {
  // Each file is one half of a pair. The XLSX carries the money and the line
  // detail; the PDF is the summary document. Default to 'xlsx' for back-compat
  // with callers that pre-date pair tracking.
  const kind = fileKind === 'pdf' ? 'pdf' : 'xlsx';
  const upload = {
    id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    writerId,
    writerName: MOCK_WRITERS.find((w) => w.id === Number(writerId))?.name || 'Unmapped',
    statementType,
    source: source || statementType,
    period,
    lines,
    matched,
    fileKind: kind,
    uploadedAt: new Date().toISOString(),
  };
  // Re-uploading the same half (writer + type + period + kind) refreshes rather
  // than duplicates. The two halves of a pair are distinct rows so the recent-
  // uploads log can show XLSX and PDF accumulating.
  if (writerId != null) {
    state.recentUploads = state.recentUploads.filter(
      (u) =>
        !(
          Number(u.writerId) === Number(writerId) &&
          u.statementType === statementType &&
          u.period === period &&
          (u.fileKind || 'xlsx') === kind
        )
    );
  }
  state.recentUploads.unshift(upload);
  if (state.recentUploads.length > 12) state.recentUploads.length = 12;

  if (writerId != null) {
    const k = _key(period, String(writerId));
    if (!receivedByWriter.has(k)) receivedByWriter.set(k, emptyReceipt());
    const rec = receivedByWriter.get(k);
    // The PDF is the one master summary for the writer/period (type-agnostic);
    // the XLSX is the per-type detail file.
    if (kind === 'pdf') rec.summaryPdf = true;
    else rec.xlsx[statementType] = true;

    const s = state.byWriter[Number(writerId)];
    // Money and line counts come from the XLSX detail only — never the PDF —
    // so a pair is counted once and PDF-only uploads add $0.
    if (s && kind === 'xlsx') {
      s.pending += Math.round(totalAmount || 0);
      s.pendingLines += Math.round(lines || 0);
      // Newly uploaded statements are pending until the admin distributes them.
      // Re-open the period so the writer portal stays gated — even if this
      // writer had a prior distribution recorded for the same period (e.g. a
      // recreated writer, or an additional statement uploaded post-distribution).
      if (s.distributedPeriods) s.distributedPeriods.delete(period);
    }

    // Record earnings override for dynamically-created writers so their portal
    // reflects actual ingested amounts rather than archetype data
    if (totalAmount > 0) {
      recordWriterEarnings(writerId, {
        amount: totalAmount,
        source: statementType,
        period,
      });
    }
  }
  emit();
  return upload;
};

export const resetDemoState = () => {
  try {
    localStorage.removeItem(PERSIST_KEY);
    // Also clear persona and selectedClientId so the reset lands on /admin cleanly
    localStorage.removeItem('rd_persona');
    localStorage.removeItem('selectedClientId');
  } catch {
    /* noop */
  }
  window.location.reload();
};

// Restore any persisted demo state at module init so a page reload (e.g. when
// the persona switch does window.location.replace) doesn't wipe out the
// distributions, pending royalties, or roster additions the admin set up.
rehydrate();

// Cross-tab sync: a demo is typically presented with the admin dashboard and
// the writer portal open in SEPARATE windows. Each tab has its own in-memory
// copy of this store, so a delete / distribute / upload in one window would
// not reach the other. localStorage fires a `storage` event in every OTHER
// tab when PERSIST_KEY changes — re-apply the snapshot there and notify
// subscribers so the writer portal reflects admin actions live.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key !== PERSIST_KEY) return;
    rehydrate();
    listeners.forEach((l) => l());
  });
}
