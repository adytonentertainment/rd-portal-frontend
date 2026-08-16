import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { List } from 'react-window';
import {
  FaUpload,
  FaTimes,
  FaCheck,
  FaFileCsv,
  FaSpinner,
  FaChevronDown,
  FaChevronRight,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { MOCK_WRITERS } from '../../mocks/roster';
import { ingestUpload, REQUIRED_STATEMENT_TYPES, CURRENT_PERIOD, addWriter } from '../../mocks/distributionState';
import { REDZED_REAL_PROFILE } from '../../mocks/redZedRealData';
import { statementsLive } from '../../config/featureFlags';
import { createUpload, getUploadStatements } from '../../api/statementsAdmin';
import styles from './adminUploadModal.module.css';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Which half of the statement pair a file is: the PDF is the summary document,
// everything else (xlsx/csv/tsv) is the detail file that carries the money.
const fileKindOf = (name = '') => (/\.pdf$/i.test(name) ? 'pdf' : 'xlsx');

// Statement types the publisher tracks per writer per period
const STATEMENT_TYPES = REQUIRED_STATEMENT_TYPES;
// Periods the publisher closes (half-year)
const PERIODS = ['H2 2025', 'H1 2025', 'H1 2026'];

// Try to detect statement type from filename, e.g. "RedZed (YouTube Publishing).xlsx"
const detectStatementType = (name) => {
  const m = name.match(/\(([^)]+)\)\s*\.(xlsx|csv|tsv|pdf)$/i);
  if (m) {
    const inner = m[1].trim();
    // exact match against known types
    const exact = STATEMENT_TYPES.find((t) => t.toLowerCase() === inner.toLowerCase());
    if (exact) return exact;
    // fuzzy: youtube, mechanical, sync, performance
    const lower = inner.toLowerCase();
    if (lower.includes('youtube')) return 'YouTube Publishing';
    if (lower.includes('mechanical')) return 'Mechanical Royalties';
    if (lower.includes('perform')) return 'Performance Royalties';
    if (lower.includes('sync')) return 'Synchronization';
  }
  return STATEMENT_TYPES[0];
};

// Detect writer from filename by scanning for any known writer name.
const detectWriter = (name) => {
  const lower = name.toLowerCase();
  for (const w of MOCK_WRITERS) {
    if (lower.includes(w.name.toLowerCase().replace(/\./g, ''))) return w.id;
  }
  return null;
};

// Best-guess writer name from a statement filename. Mirrors the backend
// filename_parser: name is what follows the beneficiary code, separated by
// "_" (xlsx form) or " - " (pdf form). Any trailing group parenthetical
// (e.g. "(Luna Negra)") is kept; only the royalty-type parens are dropped.
//   "Ben_PUB25H2_C00616_RedZed (YouTube Publishing).xlsx"      → "RedZed"
//   "Ben_PUB25H2_C00616 - RedZed (YouTube Publishing).pdf"     → "RedZed"
//   "Ben_PUB25H2_C00139f - Edipurepecha (Luna Negra) (…).pdf"  → "Edipurepecha (Luna Negra)"
// Returns null if it can't find a plausible name.
const extractWriterName = (filename) => {
  if (!filename) return null;
  // strip extension (incl. pdf) and the trailing royalty-type parenthetical
  let stripped = filename.replace(/\.(csv|xlsx|tsv|pdf)$/i, '');
  stripped = stripped.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!stripped) return null;
  // Ben_PUB<YY><H|Q><n>_<code>[ - | _]<name>
  const m = stripped.match(/^Ben_PUB\d{2}[HQ]\d[_ -]+[A-Za-z0-9]+(?:-New)?(?:\s*-\s*|_)\s*(.+)$/i);
  if (m && m[1]) return m[1].trim();
  // Fallbacks for non-standard names
  if (stripped.includes('_')) {
    const last = stripped.split('_').pop().trim();
    if (last) return last;
  }
  return stripped.length <= 60 ? stripped : null;
};

// Detect period from filename, e.g. PUB25H2 → 'H2 2025'
const detectPeriod = (name) => {
  const m = name.match(/(\d{2})H([12])/i);
  if (m) return `H${m[2]} 20${m[1]}`;
  return CURRENT_PERIOD;
};

// Raw data-row counts of the two real RedZed statement files we ship with the
// demo (used only for a believable "lines" figure in the preview).
const REDZED_FILE_LINES = { 'Mechanical Royalties': 13483, 'YouTube Publishing': 3381 };

// For the known RedZed statement files, surface the ACTUAL extracted figures
// (from redZedRealData) so the upload preview matches the writer portal. Any
// other file falls through to the size-based estimate below.
const redZedRealParse = (file, statementType) => {
  if (!/ben_pub25h2.*redzed/i.test(file?.name || '')) return null;
  const stmt = REDZED_REAL_PROFILE.statements.find((s) =>
    s.source.toLowerCase().includes(statementType.split(' ')[0].toLowerCase())
  );
  const lines = REDZED_FILE_LINES[statementType];
  if (!stmt || !lines) return null;
  const matched = Math.round(lines * 0.99);
  return { lines, matched, unmapped: lines - matched, total: stmt.amount };
};

const fakeParse = (file, statementType) => {
  const real = redZedRealParse(file, statementType);
  if (real) return real;
  const size = file.size || 12000;
  // Real files are large — base lines on size but cap appropriately
  const lines = Math.max(80, Math.min(20000, Math.round(size / 110)));
  const matchRate = 0.96;
  const matched = Math.round(lines * matchRate);
  const avgPerLine =
    statementType === 'Mechanical Royalties' ? 2.6 : statementType === 'YouTube Publishing' ? 0.38 : 4.2;
  const total = Math.round(lines * avgPerLine);
  return { lines, matched, unmapped: lines - matched, total };
};

const fmtMoney = (n) =>
  '$' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Human-readable one-liner for a parsed row's second line of text.
const subtitleFor = (f) => {
  const base = `${f.parsed.lines.toLocaleString()} lines · ${f.parsed.matched.toLocaleString()} auto-matched · ${fmtMoney(f.parsed.total)}`;
  if (!f.live) return base + (statementsLive ? ' · est.' : '');
  const pairTag = f.paired ? 'PDF+XLSX' : f.pdfPresent ? 'PDF only' : 'XLSX only';
  const reconTag = f.reconciled === true ? ' · reconciled' : f.reconciled === false ? ' · ⚠ mismatch' : '';
  const payTag = f.summary && f.summary.payable != null ? ` · payable ${fmtMoney(Number(f.summary.payable))}` : '';
  return `${base} · ${pairTag}${reconTag}${payTag}`;
};

// Why a row needs a human decision before it can ingest cleanly. Two distinct
// reasons, both surfaced explicitly rather than lumped into one "unassigned"
// bucket (the modal previously gave no explanation at all):
//   - no writer name could be read from the filename at all (pre-ingest, this
//     one blocks Ingest via canIngest)
//   - (live mode only) the file WAS matched and ingested, but its XLSX total
//     didn't reconcile against the PDF's ledger total — needs a look before
//     it's trusted, even though it doesn't block ingest itself
const attentionReason = (f) => {
  if (f.writerId == null && !f.proposedWriterName) return 'No writer detected in filename';
  if (f.live && f.reconciled === false) return 'Reconciliation mismatch — review before distributing';
  return null;
};

// Fixed row height for virtualized groups (includes the visual gap between
// rows, applied as inner padding so react-window's absolute positioning is
// left untouched). MAX_LIST_HEIGHT caps how tall an expanded group gets
// before it scrolls internally, so a handful of rows doesn't waste space and
// two thousand rows doesn't take over the modal.
const FILE_ROW_HEIGHT = 78;
const MAX_LIST_HEIGHT = 420;

// One virtualized row. Reused across every group (needs-attention / will-
// create / matched-by-type) — the markup and handlers are identical to what
// this modal always rendered per file, just now mounted by react-window
// instead of a plain .map().
const FileListRow = ({
  index,
  style,
  items,
  writers,
  statementTypes,
  periods,
  onUpdateRow,
  onRemoveRow,
  onReparse,
}) => {
  const f = items[index];
  const reason = attentionReason(f);
  return (
    <div style={style}>
      <div className={styles.fileRow} style={{ height: 'calc(100% - 8px)' }}>
        <span className={styles.fileIcon}>{f.parsing ? <FaSpinner className={styles.spin} /> : <FaFileCsv />}</span>
        <div className={styles.fileMeta}>
          <div className={styles.fileName}>{f.file.name}</div>
          <div className={styles.fileSub}>{f.parsing ? 'Parsing…' : subtitleFor(f)}</div>
          {reason && <div className={styles.attentionBadge}>{reason}</div>}
        </div>
        <select
          className={`${styles.rowSelect} ${f.writerId == null ? styles.rowSelectMissing : ''}`}
          value={f.writerId == null ? (f.proposedWriterName ? '__create__' : '') : String(f.writerId)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') {
              onUpdateRow(f.id, { writerId: null });
            } else if (v === '__create__' && f.proposedWriterName) {
              const w = addWriter({ name: f.proposedWriterName });
              if (w) onUpdateRow(f.id, { writerId: w.id, proposedWriterName: null });
            } else {
              onUpdateRow(f.id, { writerId: Number(v), proposedWriterName: null });
            }
          }}
        >
          <option value="">— Pick writer —</option>
          {f.proposedWriterName && <option value="__create__">+ Create &ldquo;{f.proposedWriterName}&rdquo;</option>}
          {writers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          className={styles.rowSelect}
          value={f.statementType}
          onChange={(e) => {
            onUpdateRow(f.id, { statementType: e.target.value });
            onReparse(f.id, e.target.value);
          }}
        >
          {statementTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className={styles.rowSelect}
          value={f.period}
          onChange={(e) => onUpdateRow(f.id, { period: e.target.value })}
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button className={styles.removeBtn} onClick={() => onRemoveRow(f.id)} aria-label="Remove">
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

// Collapsible section wrapper. `staticHeader` (used for "Needs attention")
// renders a label with no toggle — that group is never collapsed, since it's
// exactly the thing the admin needs to see and act on.
const GroupSection = ({ label, tone, count, expanded, onToggle, staticHeader, children }) => (
  <div className={styles.group}>
    {staticHeader ? (
      <div className={`${styles.groupHeaderStatic} ${tone ? styles[tone] : ''}`}>
        <span className={styles.groupLabel}>{label}</span>
        <span className={styles.groupCount}>{count}</span>
      </div>
    ) : (
      <button type="button" className={styles.groupHeaderBtn} onClick={onToggle} aria-expanded={expanded}>
        {expanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
        <span className={styles.groupLabel}>{label}</span>
        <span className={styles.groupCount}>{count}</span>
      </button>
    )}
    {expanded && count > 0 && <div className={styles.groupBody}>{children}</div>}
  </div>
);

const AdminUploadModal = ({ open, onClose, onComplete }) => {
  // Each row: { id, file, parsing, writerId, statementType, period, parsed }
  const [files, setFiles] = useState([]);
  // Backend completeness rollup for the current upload (live mode only).
  const [completeness, setCompleteness] = useState(null);
  // Distinct batch ids the ingest produced — used to link the post-ingest
  // "needs matching" banner to the batch gate view.
  const [batchIds, setBatchIds] = useState([]);
  // Surfaced backend-upload failure (live mode) so a failed ingest isn't silent.
  const [uploadError, setUploadError] = useState(null);
  // Live mode: the real backend ingest summary (replaces the demo filename
  // grouping, which is meaningless against real data). Null until files drop.
  const [liveUpload, setLiveUpload] = useState(null);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState({ needsAttention: true, willCreate: false, matched: {} });
  const inputRef = useRef(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setCompleteness(null);
      setBatchIds([]);
      setUploadError(null);
      setLiveUpload(null);
      setFilter('');
      setExpanded({ needsAttention: true, willCreate: false, matched: {} });
      counterRef.current = 0;
    }
  }, [open]);

  const reparse = useCallback((id, statementType) => {
    setFiles((prev) => prev.map((p) => (p.id === id ? { ...p, parsing: true } : p)));
    setTimeout(
      () => {
        setFiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, parsing: false, parsed: fakeParse(p.file, statementType) } : p))
        );
      },
      300 + Math.random() * 200
    );
  }, []);

  // Live mode: upload the dropped files to the real backend and show its actual
  // ingest result — clients created, statements sorted, pairing completeness —
  // NOT the demo filename heuristic (which matches against 5 mock writers and is
  // nonsense against real data). Ingestion runs in a background worker, so we
  // poll for progress; the roster fills as statements are processed.
  const liveUploadFiles = useCallback(async (incoming) => {
    setUploadError(null);
    setLiveUpload({
      fileCount: incoming.length,
      status: 'uploading',
      writers: 0,
      statements: 0,
      completeness: null,
      batchIds: [],
    });
    try {
      const { upload_id: uploadId } = await createUpload(incoming);
      for (let i = 0; i < 60; i += 1) {
        const res = await getUploadStatements(uploadId);
        const statements = res.statements || [];
        // distinct real clients this upload created/attached to
        const writers = new Set(statements.map((s) => s.writer_name).filter(Boolean)).size;
        // total $ across the uploaded statements — the only figure we surface
        const total = statements.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const status = res.status;
        setLiveUpload({
          uploadId,
          fileCount: incoming.length,
          status,
          writers,
          statements: statements.length,
          total,
          sort: res.sort || null,
          batchIds: res.batch_ids || [],
        });
        if (status === 'done' || status === 'failed') break;
        await sleep(1500);
      }
    } catch (err) {
      // Surface it — a silent failure looked like "upload did nothing". Common
      // causes: not signed in (401), backend down (status 0), payload rejected.
      const status = err?.status;
      const msg =
        status === 401 || status === 403
          ? 'Not authorized — sign in again, then re-drop the files.'
          : status === 0
            ? 'Cannot reach the backend. Is it running on the configured URL?'
            : err?.message || 'The backend rejected the upload.';
      setUploadError(`Statements were NOT ingested: ${msg}`);
      setLiveUpload(null);
    }
  }, []);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (!incoming.length) return;
      // Live mode: hand straight to the backend; no demo per-file grouping.
      if (statementsLive) {
        liveUploadFiles(incoming);
        return;
      }
      const newRows = incoming.map((file) => {
        const id = ++counterRef.current;
        const writerId = detectWriter(file.name);
        const proposedWriterName = writerId == null ? extractWriterName(file.name) : null;
        const statementType = detectStatementType(file.name);
        const period = detectPeriod(file.name);
        return { id, file, parsing: true, writerId, proposedWriterName, statementType, period, parsed: null };
      });
      setFiles((prev) => [...prev, ...newRows]);
      // Immediate estimate so the row isn't empty while the backend parses.
      newRows.forEach((row) => {
        setTimeout(
          () => {
            setFiles((prev) =>
              prev.map((p) =>
                p.id === row.id ? { ...p, parsing: false, parsed: fakeParse(p.file, p.statementType) } : p
              )
            );
          },
          600 + Math.random() * 500
        );
      });
    },
    [liveUploadFiles]
  );

  const updateRow = useCallback(
    (id, patch) => setFiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    []
  );
  const removeRow = useCallback((id) => setFiles((prev) => prev.filter((p) => p.id !== id)), []);
  const clearAll = () => setFiles([]);

  const onDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const totals = useMemo(
    () =>
      files.reduce(
        (acc, f) => {
          if (!f.parsed) return acc;
          acc.lines += f.parsed.lines;
          acc.matched += f.parsed.matched;
          acc.unmapped += f.parsed.unmapped;
          acc.total += f.parsed.total;
          return acc;
        },
        { lines: 0, matched: 0, unmapped: 0, total: 0 }
      ),
    [files]
  );

  // Rows that have no writer yet but DO have a proposed name from the filename
  // are eligible for auto-create on Ingest. These — along with the counts,
  // gate, and bulk-create action below — are computed from the FULL,
  // unfiltered `files` array, independent of the search filter or which
  // groups happen to be expanded: an admin filtering the list to review one
  // writer must not accidentally shrink what "Create writers now" or Ingest
  // operate on.
  const autoCreatable = files.filter((f) => f.writerId == null && f.proposedWriterName);
  // Multiple files can propose the same writer (e.g. RedZed's two statements) —
  // count distinct names so the preview doesn't overstate how many are created.
  const autoCreatableCount = new Set(autoCreatable.map((f) => f.proposedWriterName.toLowerCase())).size;
  const trulyUnassigned = files.filter((f) => f.writerId == null && !f.proposedWriterName);
  const parsingCount = files.filter((f) => f.parsing).length;
  const canIngest = files.length > 0 && parsingCount === 0 && trulyUnassigned.length === 0;

  // --- Filtered, grouped VIEW of the same files (rendering only) ------------
  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => {
      const writerName = MOCK_WRITERS.find((w) => w.id === f.writerId)?.name;
      return (
        f.file.name.toLowerCase().includes(q) ||
        (f.proposedWriterName && f.proposedWriterName.toLowerCase().includes(q)) ||
        (writerName && writerName.toLowerCase().includes(q))
      );
    });
  }, [files, filter]);

  const needsAttentionView = useMemo(() => filteredFiles.filter((f) => attentionReason(f) != null), [filteredFiles]);
  const willCreateView = useMemo(
    () => filteredFiles.filter((f) => f.writerId == null && f.proposedWriterName),
    [filteredFiles]
  );
  // Matched, grouped by statement type — excludes rows already shown in
  // "Needs attention" (a reconciliation mismatch) so nothing renders twice.
  const matchedGroups = useMemo(() => {
    const byType = new Map();
    for (const f of filteredFiles) {
      if (f.writerId == null || attentionReason(f)) continue;
      if (!byType.has(f.statementType)) byType.set(f.statementType, []);
      byType.get(f.statementType).push(f);
    }
    const ordered = [];
    for (const t of STATEMENT_TYPES) {
      if (byType.has(t)) {
        ordered.push([t, byType.get(t)]);
        byType.delete(t);
      }
    }
    for (const entry of byType) ordered.push(entry);
    return ordered;
  }, [filteredFiles]);

  const toggleGroup = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleMatchedGroup = (type) =>
    setExpanded((prev) => ({ ...prev, matched: { ...prev.matched, [type]: !prev.matched[type] } }));

  const listHeightFor = (count) => Math.min(count * FILE_ROW_HEIGHT, MAX_LIST_HEIGHT);
  const rowPropsFor = (items) => ({
    items,
    writers: MOCK_WRITERS,
    statementTypes: STATEMENT_TYPES,
    periods: PERIODS,
    onUpdateRow: updateRow,
    onRemoveRow: removeRow,
    onReparse: reparse,
  });

  const createMissingNow = () => {
    setFiles((prev) => {
      const cache = {};
      return prev.map((f) => {
        if (f.writerId != null || !f.proposedWriterName) return f;
        const key = f.proposedWriterName.toLowerCase();
        if (!cache[key]) {
          const w = addWriter({ name: f.proposedWriterName });
          cache[key] = w?.id ?? null;
        }
        return { ...f, writerId: cache[key], proposedWriterName: null };
      });
    });
  };

  const commit = () => {
    // Auto-create any writers that the filename proposed but don't yet exist
    const cache = {};
    const newWriterIds = [];
    const resolved = files.map((f) => {
      if (f.writerId != null) return f;
      if (!f.proposedWriterName) return f;
      const key = f.proposedWriterName.toLowerCase();
      if (!cache[key]) {
        const existingWriter = MOCK_WRITERS.find((w) => w.name.toLowerCase() === key);
        if (!existingWriter) {
          const w = addWriter({ name: f.proposedWriterName });
          cache[key] = w?.id ?? null;
          if (w) newWriterIds.push(w.id);
        } else {
          cache[key] = existingWriter.id;
        }
      }
      return { ...f, writerId: cache[key], proposedWriterName: null };
    });
    resolved.forEach((f) => {
      if (!f.parsed || f.writerId == null) return;
      const kind = fileKindOf(f.file?.name);
      ingestUpload({
        writerId: f.writerId,
        statementType: f.statementType,
        period: f.period,
        source: f.statementType,
        lines: f.parsed.lines,
        matched: f.parsed.matched,
        // The PDF carries no money — the XLSX half of the pair does — so a
        // pair is counted once and PDF-only uploads add $0.
        totalAmount: kind === 'pdf' ? 0 : f.parsed.total,
        fileKind: kind,
      });
    });
    onComplete?.({ filesCount: files.length, newWritersCreated: newWriterIds.length, newWriterIds, ...totals });
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <div className={styles.title}>Bulk upload statements</div>
            <div className={styles.subtitle}>
              Drop any number of files. Writer, statement type, and period are auto-detected from the filename and can
              be corrected per file.
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div
          className={styles.dropzone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.tsv,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <FaUpload size={22} />
          <div className={styles.dropTitle}>Drop PDF / XLSX / CSV files</div>
          <div className={styles.dropHint}>
            Filenames like <code>Ben_PUB25H2_C00616_RedZed (YouTube Publishing).xlsx</code> are auto-mapped.
          </div>
        </div>

        {/* Live mode: real backend ingest summary (clients/statements created),
            not the demo filename grouping. */}
        {statementsLive && liveUpload && (
          <div className={styles.liveSummary}>
            <div className={styles.liveHead}>
              <strong>{liveUpload.fileCount.toLocaleString()}</strong> files uploaded
              {liveUpload.status === 'done' ? (
                <span className={styles.liveDone}>
                  {' · '}
                  <FaCheck size={11} /> ingested
                </span>
              ) : liveUpload.status === 'failed' ? (
                <span className={styles.batchWarn}> · failed</span>
              ) : (
                <span className={styles.batchParsing}>
                  {' · '}
                  <FaSpinner className={styles.spin} size={11} /> ingesting in the background…
                </span>
              )}
            </div>
            <div className={styles.liveStats}>
              <div className={styles.liveStat}>
                <span className={styles.liveNum}>{liveUpload.writers.toLocaleString()}</span>
                <span className={styles.liveLabel}>clients</span>
              </div>
              <div className={styles.liveStat}>
                <span className={styles.liveNum}>{liveUpload.statements.toLocaleString()}</span>
                <span className={styles.liveLabel}>statements</span>
              </div>
              <div className={styles.liveStat}>
                <span className={styles.liveNum}>{fmtMoney(liveUpload.total || 0)}</span>
                <span className={styles.liveLabel}>total</span>
              </div>
            </div>
            <div className={styles.liveNote}>
              {(() => {
                const done = liveUpload.status === 'done' || liveUpload.status === 'failed';
                const sorting = liveUpload.status === 'uploading' || liveUpload.status === 'sorting';
                const dups = liveUpload.sort?.duplicates || 0;
                if (liveUpload.statements === 0 && sorting) {
                  return 'Sorting files… clients will appear here in a moment.';
                }
                if (liveUpload.statements === 0 && dups > 0) {
                  return `These ${dups.toLocaleString()} files were already ingested (duplicates) — nothing new to create.`;
                }
                if (liveUpload.statements === 0 && done) {
                  return 'No new statements were created from these files.';
                }
                return 'Clients are in the roster now. You can close this.';
              })()}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className={styles.batchBar}>
            <div className={styles.batchSummary}>
              <strong>{files.length}</strong> file{files.length === 1 ? '' : 's'}
              {parsingCount > 0 && (
                <span className={styles.batchParsing}>
                  {' · '}
                  <FaSpinner className={styles.spin} size={10} /> parsing {parsingCount}
                </span>
              )}
              {autoCreatableCount > 0 && (
                <span className={styles.batchWarn}>
                  {' · '}
                  {autoCreatableCount} new writer{autoCreatableCount === 1 ? '' : 's'} will be created
                </span>
              )}
              {trulyUnassigned.length > 0 && (
                <span className={styles.batchWarn}>
                  {' · '}
                  {trulyUnassigned.length} need writer
                </span>
              )}
            </div>
            <div style={{ display: 'inline-flex', gap: 10 }}>
              {autoCreatable.length > 0 && (
                <button className={styles.clearAllBtn} onClick={createMissingNow}>
                  Create writers now
                </button>
              )}
              <button className={styles.clearAllBtn} onClick={clearAll}>
                Clear all
              </button>
            </div>
          </div>
        )}

        {uploadError && (
          <div
            className={styles.resolutionBanner}
            role="alert"
            style={{
              color: 'var(--error, #ef4444)',
              background: 'rgba(239,68,68,0.1)',
              borderColor: 'rgba(239,68,68,0.3)',
            }}
          >
            <FaExclamationTriangle size={13} />
            <span>{uploadError}</span>
          </div>
        )}

        {completeness && (
          <div className={styles.batchBar} aria-label="Statement completeness">
            <div className={styles.batchSummary}>
              <strong>Completeness</strong>
              {' · '}
              {completeness.paired}/{completeness.total} paired (PDF + XLSX)
              {completeness.missing_pdf > 0 && (
                <span className={styles.batchWarn}>
                  {' · '}
                  {completeness.missing_pdf} missing PDF
                </span>
              )}
              {completeness.missing_xlsx > 0 && (
                <span className={styles.batchWarn}>
                  {' · '}
                  {completeness.missing_xlsx} missing XLSX
                </span>
              )}
              {completeness.unparsed > 0 && (
                <span className={styles.batchWarn}>
                  {' · '}
                  {completeness.unparsed} unparsed
                </span>
              )}
              {(completeness.reconciled > 0 || completeness.unreconciled > 0) && (
                <span className={completeness.unreconciled > 0 ? styles.batchWarn : undefined}>
                  {' · '}
                  {completeness.reconciled} reconciled
                  {completeness.unreconciled > 0 ? `, ${completeness.unreconciled} mismatched` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Post-ingest resolution banner (live mode). "Unassigned" in the file
            list above is a PRE-ingest, filename-local concept; this is the
            distinct POST-ingest concept — accounts that ingested but didn't
            cleanly match a client-list identity. They live in the client-import
            resolution queue / batch gate view, not in this modal. */}
        {completeness && completeness.unresolved_writers > 0 && (
          <div className={styles.resolutionBanner} role="status">
            <FaExclamationTriangle size={13} />
            <span>
              <strong>{completeness.unresolved_writers}</strong> account
              {completeness.unresolved_writers === 1 ? '' : 's'} from this upload{' '}
              {completeness.unresolved_writers === 1 ? 'needs' : 'need'} manual matching to a client.
            </span>
            {batchIds.length > 0 && (
              <Link className={styles.resolutionLink} to={`/admin/statements/${batchIds[0]}`} onClick={onClose}>
                Review in gate →
              </Link>
            )}
          </div>
        )}

        {files.length > 0 && (
          <>
            <div className={styles.toolbar}>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Filter by filename or writer…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              {filter && (
                <button
                  type="button"
                  className={styles.clearFilterBtn}
                  onClick={() => setFilter('')}
                  aria-label="Clear filter"
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>

            <div className={styles.groups}>
              {needsAttentionView.length > 0 && (
                <GroupSection
                  label="Needs attention"
                  tone="attentionTone"
                  count={needsAttentionView.length}
                  expanded
                  staticHeader
                >
                  <List
                    rowComponent={FileListRow}
                    rowCount={needsAttentionView.length}
                    rowHeight={FILE_ROW_HEIGHT}
                    rowProps={rowPropsFor(needsAttentionView)}
                    style={{ height: listHeightFor(needsAttentionView.length) }}
                  />
                </GroupSection>
              )}

              {willCreateView.length > 0 && (
                <GroupSection
                  label="Will create new writer"
                  count={willCreateView.length}
                  expanded={expanded.willCreate}
                  onToggle={() => toggleGroup('willCreate')}
                >
                  <List
                    rowComponent={FileListRow}
                    rowCount={willCreateView.length}
                    rowHeight={FILE_ROW_HEIGHT}
                    rowProps={rowPropsFor(willCreateView)}
                    style={{ height: listHeightFor(willCreateView.length) }}
                  />
                </GroupSection>
              )}

              {matchedGroups.map(([type, rows]) => (
                <GroupSection
                  key={type}
                  label={type}
                  count={rows.length}
                  expanded={!!expanded.matched[type]}
                  onToggle={() => toggleMatchedGroup(type)}
                >
                  <List
                    rowComponent={FileListRow}
                    rowCount={rows.length}
                    rowHeight={FILE_ROW_HEIGHT}
                    rowProps={rowPropsFor(rows)}
                    style={{ height: listHeightFor(rows.length) }}
                  />
                </GroupSection>
              ))}

              {filter &&
                needsAttentionView.length === 0 &&
                willCreateView.length === 0 &&
                matchedGroups.length === 0 && (
                  <div className={styles.noResults}>No files match &ldquo;{filter}&rdquo;.</div>
                )}
            </div>
          </>
        )}

        <footer className={styles.footer}>
          <div className={styles.footerTotals}>
            {!statementsLive &&
              files.length > 0 &&
              `${totals.lines.toLocaleString()} lines · ${fmtMoney(totals.total)}`}
          </div>
          <div className={styles.footerActions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              {statementsLive && liveUpload ? 'Close' : 'Cancel'}
            </button>
            {statementsLive ? (
              // Live mode: ingest already happens on drop (background worker) —
              // this just closes and refreshes the roster.
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  onComplete?.({ filesCount: liveUpload?.fileCount || 0 });
                  onClose?.();
                }}
                disabled={!liveUpload}
              >
                <FaCheck size={11} /> Done
              </button>
            ) : (
              <button className={styles.primaryBtn} onClick={commit} disabled={!canIngest}>
                <FaCheck size={11} /> Ingest{' '}
                {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'}` : ''}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminUploadModal;
