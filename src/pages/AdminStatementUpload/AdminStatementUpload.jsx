import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FaUpload, FaArrowLeft, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { addStatement, generateStatementId, SOURCES } from '../../mocks/statementsAdminData';
import { statementsLive } from '../../config/featureFlags';
import { createUpload, resumeUpload, getUpload } from '../../api/statementsAdmin';
import IngestActivity from '../../components/IngestActivity/IngestActivity';
import { deriveSortPreview } from '../../utils/statementFilenames';
import styles from './adminStatementUpload.module.css';

const SOURCE_OPTIONS = ['Auto-detect', ...SOURCES];

// Where an in-flight upload id is parked so a tab that dies mid-transfer
// can still be resumed rather than stranding the files already sent.
const PENDING_KEY = 'rdPendingUploadId';

// How many times a transfer picks itself back up after the connection drops,
// and how long it waits before each attempt. Generous on purpose: a Wi-Fi roam
// resolves in seconds, a VPN reconnect can take a minute, and the cost of
// waiting is nothing next to re-sending 2 GB.
const RECOVERY_ATTEMPTS = 6;
const RECOVERY_WAIT_MS = [3000, 8000, 15000, 30000, 60000, 60000];

// ---------------------------------------------------------------------------
// Mock upload (flag off) — pre-existing demo behavior, unchanged.
// ---------------------------------------------------------------------------

const MockStatementUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedSource, setSelectedSource] = useState('Auto-detect');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;

    setIsParsing(true);

    // Simulate parsing delay
    setTimeout(() => {
      const newId = generateStatementId();
      const source =
        selectedSource === 'Auto-detect' ? SOURCES[Math.floor(Math.random() * SOURCES.length)] : selectedSource;

      const now = new Date();
      const periodLabel = now.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      const newStatement = {
        id: newId,
        source,
        periodLabel,
        uploadedAt: now.toISOString(),
        status: 'staged',
        totalReported: Math.floor(Math.random() * 15000) + 2000,
        totalMatched: 0,
        transactionCount: Math.floor(Math.random() * 800) + 100,
      };

      addStatement(newStatement);
      navigate(`/admin/statements/${newId}`);
    }, 800);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.uploadContainer}>
      {isParsing ? (
        <div className={styles.parsing}>
          <div className={styles.spinner} />
          <p className={styles.parsingText}>Parsing statement...</p>
        </div>
      ) : (
        <>
          <div className={styles.sourceSelector}>
            <label className={styles.sourceLabel}>Source</label>
            <select
              className={styles.sourceSelect}
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              {SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <FaUpload className={styles.dropIcon} />
            <p className={styles.dropText}>Drop a statement file here or click to browse</p>
            <p className={styles.dropHint}>Accepts .csv and .xlsx files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleInputChange}
              className={styles.hiddenInput}
            />
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Live upload (flag on) — dump loose files, watch the backend sort them.
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = ['done', 'failed'];
const STAGE_STEPS = [
  { key: 'uploaded', label: 'Queued' },
  { key: 'sorting', label: 'Sorting' },
  { key: 'parsing', label: 'Parsing' },
  { key: 'validating', label: 'Validating' },
  { key: 'done', label: 'Done' },
];

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Flatten the upload stats' unsortable buckets into {filename, reason} rows.
const unsortableRows = (upload) => {
  const stats = upload?.stats || {};
  const sort = stats.sort || {};
  const rows = [];
  (stats.skipped || []).forEach((name) => rows.push({ filename: name, reason: 'Not a .pdf/.xlsx file' }));
  (sort.unparseable || []).forEach((name) => rows.push({ filename: name, reason: 'Filename not recognized' }));
  (sort.duplicates || []).forEach((name) =>
    rows.push({ filename: name, reason: 'Duplicate of an already-ingested statement' })
  );
  (sort.unpaired || []).forEach((name) =>
    rows.push({ filename: name, reason: 'Missing its PDF/XLSX counterpart (statement still created)' })
  );
  return rows;
};

const LiveStatementUpload = () => {
  const fileInputRef = useRef(null);
  const [queued, setQueued] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  // phase: select | uploading | processing | done | failed
  const [phase, setPhase] = useState('select');
  const [uploadPct, setUploadPct] = useState(0);
  // Set when a transfer fails partway: the files already on the server can
  // be kept and only the missing ones re-sent.
  const [resumeId, setResumeId] = useState(null);
  const [upload, setUpload] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [pollPaused, setPollPaused] = useState(false);
  // An id recovered from a previous tab that died mid-transfer (see PENDING_KEY).
  const [strandedId, setStrandedId] = useState(null);
  // Set while a dropped transfer is picking itself back up.
  const [recovering, setRecovering] = useState(null);

  const uploadId = upload?.upload_id ?? null;

  // A transfer lives entirely in this tab's JavaScript. Close the tab, reload
  // it, or follow a link out, and the loop is gone mid-batch: no error is
  // raised because there is nothing left to raise it in, the files already
  // sent stay on the server, and the upload sits at 'receiving' until the
  // server times it out half an hour later. That is exactly the state a
  // 5,224-file transfer was found in, stuck at 49 files with the browser
  // making no requests at all. Two guards, because either alone leaves a hole:
  // ask before the tab goes, and remember the id in case it goes anyway.
  useEffect(() => {
    if (phase !== 'uploading') return undefined;
    const warn = (e) => {
      e.preventDefault();
      // Chrome ignores custom text but requires returnValue to be set.
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  // Survives the tab: the id is the only handle on files already uploaded.
  // Confirm with the server before crying interruption — the id also outlives
  // a transfer that finished fine in another tab, and telling an admin their
  // completed upload was interrupted would send them re-dropping 2 GB for
  // nothing.
  useEffect(() => {
    if (phase !== 'select' || resumeId) return undefined;
    let pending = null;
    try {
      pending = localStorage.getItem(PENDING_KEY);
    } catch {
      // Private mode / blocked storage: recovery is unavailable, not fatal.
    }
    if (!pending) return undefined;

    let cancelled = false;
    getUpload(pending)
      .then((data) => {
        if (cancelled) return;
        if (TERMINAL_STATUSES.includes(data.status)) clearPending();
        else setStrandedId(pending);
      })
      .catch((err) => {
        // 404: the upload is gone, so the id is worthless — drop it. Anything
        // else (offline, 500) may be temporary, so keep it for the next visit.
        if (cancelled) return;
        if (err?.status === 404) clearPending();
      });
    return () => {
      cancelled = true;
    };
  }, [phase, resumeId]);

  useEffect(() => {
    if (phase !== 'processing' || !uploadId || pollPaused) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await getUpload(uploadId);
        if (cancelled) return;
        setError(null);
        setUpload(data);
        if (TERMINAL_STATUSES.includes(data.status)) {
          setPhase(data.status === 'done' ? 'done' : 'failed');
        }
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setPollPaused(true);
      }
    };
    tick();
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, uploadId, pollPaused]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setQueued((prev) => {
      const seen = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !seen.has(f.name))];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const clearPending = () => {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {
      // nothing to clean up if storage was never available
    }
  };

  const runUpload = async (resumeId) => {
    setError(null);
    setUploadPct(0);
    setPhase('uploading');
    setStrandedId(null);
    setPreview(deriveSortPreview(queued.map((f) => f.name)));

    // Park the id the moment the server issues one, not when the transfer
    // ends: the whole point is to survive an ending that never happens.
    const onProgress = (pct, info) => {
      setUploadPct(pct);
      if (info?.uploadId) {
        try {
          localStorage.setItem(PENDING_KEY, String(info.uploadId));
        } catch {
          // Storage unavailable — the transfer itself is unaffected.
        }
      }
    };

    // Keep picking the transfer back up rather than handing it back as an
    // error. Server logs show every lane dying in the same second with the
    // page still alive and no unload — the whole socket pool to the host went
    // at once, which is what a Wi-Fi roam, a VPN reconnect or a firewall looks
    // like from in here. The batches already sent are on the server, so the
    // right answer is to wait for the network and ask what is still missing,
    // not to make somebody re-drop two gigabytes because the link blinked.
    //
    // Each pass re-reads /missing, so a pass that transfers nothing costs one
    // request. Genuine failures — a 409 from a cancelled upload, files that no
    // longer match the manifest — are not connection faults and stop at once.
    let attempt = 0;
    let current = resumeId;

    for (;;) {
      try {
        const created = current
          ? await resumeUpload(current, queued, onProgress)
          : await createUpload(queued, onProgress);
        setUpload(created);
        setResumeId(null);
        setRecovering(null);
        clearPending();
        setPollPaused(false);
        setPhase('processing');
        return;
      } catch (err) {
        const lostConnection = err?.status === 0;
        current = err?.upload_id || current;
        attempt += 1;
        if (!lostConnection || !current || attempt > RECOVERY_ATTEMPTS) {
          setRecovering(null);
          throw err;
        }
        const waitMs = RECOVERY_WAIT_MS[Math.min(attempt - 1, RECOVERY_WAIT_MS.length - 1)];
        setRecovering({ attempt, of: RECOVERY_ATTEMPTS, waitMs });
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  };

  const runUploadGuarded = async (resumeId) => {
    try {
      await runUpload(resumeId);
    } catch (err) {
      // Keep the upload id. Losing it was what made every interruption
      // unrecoverable: the files were safe on the server, but nothing could
      // name the upload, so the only option was re-sending 2 GB from zero.
      if (err?.upload_id) setResumeId(err.upload_id);
      setError(err);
      setPhase('select');
    }
  };

  const handleSubmit = () => runUploadGuarded(null);

  const reset = () => {
    setQueued([]);
    setPhase('select');
    setUpload(null);
    setPreview(null);
    setError(null);
    setUploadPct(0);
    setResumeId(null);
    setStrandedId(null);
    setRecovering(null);
    clearPending();
    setPollPaused(false);
  };

  const totalSize = queued.reduce((sum, f) => sum + f.size, 0);
  const stats = upload?.stats || {};
  const sortStats = stats.sort || null;
  const parseStats = stats.parse || null;
  const status = upload?.status ?? null;
  const stageIndex = STAGE_STEPS.findIndex((s) => s.key === status);
  const unsortable = unsortableRows(upload);

  return (
    <div className={styles.liveContainer}>
      <IngestActivity />

      {error && (
        <div className={styles.errorBanner}>
          <FaExclamationTriangle />
          <div className={styles.errorBannerText}>
            <strong>{error.status === 0 ? 'Backend unreachable' : 'Upload error'}</strong>
            <span>{incompleteDetail(error) || error.message}</span>
            {resumeId && (
              <span className={styles.mutedNote}>
                Files already sent are kept on the server — resuming sends only what is missing.
              </span>
            )}
          </div>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => {
              if (phase === 'processing') {
                setError(null);
                setPollPaused(false);
              } else {
                // Resume rather than restart: re-sending would abandon the
                // files already uploaded and mint a second upload.
                runUploadGuarded(resumeId);
              }
            }}
          >
            {resumeId ? 'Resume upload' : 'Retry'}
          </button>
        </div>
      )}

      {recovering && (
        <div className={styles.errorBanner}>
          <FaExclamationTriangle />
          <div className={styles.errorBannerText}>
            <strong>Connection lost — picking the transfer back up</strong>
            <span>
              Attempt {recovering.attempt} of {recovering.of}, retrying in {Math.round(recovering.waitMs / 1000)}s.
            </span>
            <span className={styles.mutedNote}>
              Everything already sent is safe on the server. Only the missing files get re-sent, so leave this page
              open.
            </span>
          </div>
        </div>
      )}

      {!error && strandedId && phase === 'select' && (
        <div className={styles.errorBanner}>
          <FaExclamationTriangle />
          <div className={styles.errorBannerText}>
            <strong>An upload was interrupted</strong>
            <span>
              Upload {strandedId} never finished — the tab was closed or reloaded while files were still transferring.
            </span>
            <span className={styles.mutedNote}>
              Everything already sent is still on the server. Drop the same folder again and only the missing files are
              transferred.
            </span>
          </div>
          <button
            type="button"
            className={styles.retryButton}
            disabled={!queued.length}
            onClick={() => {
              setStrandedId(null);
              runUploadGuarded(strandedId);
            }}
          >
            Resume upload
          </button>
        </div>
      )}

      {phase === 'select' && (
        <>
          <div
            className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <FaUpload className={styles.dropIcon} />
            <p className={styles.dropText}>Drop ALL your statement files here — no pre-sorting needed</p>
            <p className={styles.dropHint}>
              Any mix of periods, catalogs and writers. PDF + XLSX. The system sorts them for you.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
              className={styles.hiddenInput}
            />
          </div>

          {queued.length > 0 && (
            <div className={styles.queuePanel}>
              <div className={styles.queueStats}>
                <span className={styles.queueCount}>
                  {queued.length} file{queued.length === 1 ? '' : 's'} queued
                </span>
                <span className={styles.queueSize}>{formatBytes(totalSize)}</span>
              </div>
              <div className={styles.queueActions}>
                <button type="button" className={styles.ghostButton} onClick={() => setQueued([])}>
                  Clear
                </button>
                <button type="button" className={styles.primaryButton} onClick={handleSubmit}>
                  Upload {queued.length} file{queued.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'uploading' && (
        <div className={styles.progressPanel}>
          <p className={styles.progressLabel}>
            Uploading {queued.length} files ({formatBytes(totalSize)})… {uploadPct}%
          </p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${uploadPct}%` }} />
          </div>
        </div>
      )}

      {(phase === 'processing' || phase === 'done' || phase === 'failed') && upload && (
        <div className={styles.pipelinePanel}>
          <div className={styles.pipelineHeader}>
            <span className={styles.uploadIdTag}>Upload #{uploadId}</span>
            <span className={phase === 'failed' ? styles.statusFailed : styles.statusChip}>
              {phase === 'failed' ? 'Failed' : (STAGE_STEPS[stageIndex]?.label ?? status)}
            </span>
          </div>

          <div className={styles.stageRow}>
            {STAGE_STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`${styles.stageStep} ${
                  i < stageIndex || phase === 'done' ? styles.stageDone : ''
                } ${i === stageIndex && phase === 'processing' ? styles.stageActive : ''}`}
              >
                {step.label}
              </div>
            ))}
          </div>

          <div className={styles.countersGrid}>
            <div className={styles.counter}>
              <span className={styles.counterValue}>{upload.file_count ?? queued.length}</span>
              <span className={styles.counterLabel}>files received</span>
            </div>
            <div className={styles.counter}>
              <span className={styles.counterValue}>{sortStats ? sortStats.statements : '—'}</span>
              <span className={styles.counterLabel}>statements sorted</span>
            </div>
            <div className={styles.counter}>
              <span className={styles.counterValue}>{parseStats ? parseStats.parsed : '—'}</span>
              <span className={styles.counterLabel}>parsed</span>
            </div>
            <div className={styles.counter}>
              <span className={`${styles.counterValue} ${parseStats?.failed ? styles.counterBad : ''}`}>
                {parseStats ? parseStats.failed : '—'}
              </span>
              <span className={styles.counterLabel}>failed</span>
            </div>
            <div className={styles.counter}>
              <span className={styles.counterValue}>{parseStats ? parseStats.remaining : '—'}</span>
              <span className={styles.counterLabel}>remaining</span>
            </div>
          </div>

          {phase === 'failed' && stats.error && <div className={styles.failDetail}>Pipeline error: {stats.error}</div>}

          {phase === 'done' && (
            <div className={styles.summaryPanel}>
              <div className={styles.summaryHeadline}>
                <FaCheckCircle className={styles.summaryIcon} />
                {upload.file_count} files → {sortStats?.batches ?? 0} batch
                {(sortStats?.batches ?? 0) === 1 ? '' : 'es'}
                {preview ? ` → ${preview.writerCount} writer${preview.writerCount === 1 ? '' : 's'}` : ''}
              </div>

              {preview && preview.batches.length > 0 && (
                <table className={styles.summaryTable}>
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Period</th>
                      <th>Catalog</th>
                      <th>Statements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.batches.map((b) => (
                      <tr key={`${b.periodCode}-${b.catalog}`}>
                        <td>{b.label}</td>
                        <td>{b.periodCode}</td>
                        <td>{b.catalog}</td>
                        <td>{b.statementCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className={styles.summaryNote}>
                Batch breakdown derived from filenames — the server-side sort is authoritative.
              </p>

              {unsortable.length > 0 ? (
                <div className={styles.unsortableSection}>
                  <h3 className={styles.unsortableTitle}>
                    <FaExclamationTriangle /> {unsortable.length} file
                    {unsortable.length === 1 ? '' : 's'} couldn&apos;t be sorted cleanly
                  </h3>
                  <ul className={styles.unsortableList}>
                    {unsortable.map((row) => (
                      <li key={row.filename}>
                        <span className={styles.unsortableName}>{row.filename}</span>
                        <span className={styles.unsortableReason}>{row.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={styles.allSortedNote}>All files sorted cleanly.</p>
              )}

              <div className={styles.summaryActions}>
                <Link to="/admin/statements" className={styles.primaryButton}>
                  View batches
                </Link>
                <button type="button" className={styles.ghostButton} onClick={reset}>
                  Upload more files
                </button>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className={styles.summaryActions}>
              <button type="button" className={styles.ghostButton} onClick={reset}>
                Start over
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// The server refuses to finalize an incomplete drop and says exactly what is
// missing. Show that instead of a bare "conflict".
const incompleteDetail = (err) => {
  const d = err?.detail;
  if (!d || d.error !== 'incomplete_upload') return null;
  const bits = [];
  if (d.missing_count) bits.push(`${d.missing_count.toLocaleString()} file(s) never arrived`);
  if (d.short_count) bits.push(`${d.short_count.toLocaleString()} arrived incomplete`);
  return `${d.on_disk?.toLocaleString?.() ?? d.on_disk} of ${
    d.expected?.toLocaleString?.() ?? d.expected
  } files received — ${bits.join(', ')}. Resume to send the rest.`;
};

const AdminStatementUpload = () => {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return <Navigate to="/earnings" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Upload Statement | Admin | RD</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <Link to="/admin/statements" className={styles.backLink}>
            <FaArrowLeft size={12} />
            Back to Statements
          </Link>

          <div className={styles.header}>
            <h1 className={styles.title}>{statementsLive ? 'Upload Statements' : 'Upload Statement'}</h1>
            <p className={styles.subtitle}>
              {statementsLive
                ? 'Dump all your loose statement files — the system sorts them by writer, period and catalog'
                : 'Import a royalty statement for processing'}
            </p>
          </div>

          {statementsLive ? <LiveStatementUpload /> : <MockStatementUpload />}
        </main>
      </div>
    </>
  );
};

export default AdminStatementUpload;
