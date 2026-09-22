import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCheck,
  FaChevronDown,
  FaChevronRight,
  FaDownload,
  FaExclamationTriangle,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import { listUploads, cancelUpload, getUploadFailures, downloadUploadFailuresCsv } from '../../api/statementsAdmin';
import { parseServerTime } from '../../utils/serverTime';
import styles from './ingestActivity.module.css';

// Live view of every statement upload on the server — transferring, sorting,
// parsing, done, failed. The upload page only ever showed ITS OWN upload, so a
// transfer resumed from another tab (or an ingest running server-side) was
// completely invisible: the admin stared at a dashboard reading $0 with no way
// to tell "nothing is happening" from "2,613 statements are mid-parse".
const POLL_MS = 5000;
// A transfer that has received nothing for this long is not slow, it is over:
// the browser stopped sending. The server only gives up after 30 minutes, and
// saying "Transferring" for half an hour while nothing happens is worse than
// saying nothing — it is the screen actively misleading you.
const STALLED_AFTER_MS = 90_000;
const DISMISS_KEY = 'ingestActivityDismissed';
// How many failures to render inline. A 5,000-file drop with a systematic
// naming problem produces thousands of rows; the panel is a status strip, not
// a report viewer, so the rest goes out as the CSV.
const PROBLEM_PREVIEW = 8;

// What the panel is currently reporting. Dismissal is remembered against THIS,
// not forever: closing it means "I have seen this", not "never tell me again".
// A new upload, or one of these changing state, brings the panel back — hiding
// a live ingest permanently would leave the admin staring at a disabled Send
// button with nothing on screen explaining why.
const signatureOf = (rows) => rows.map((u) => `${u.upload_id}:${u.status}`).join('|');

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = parseServerTime(iso);
  return d ? d.toLocaleTimeString() : '—';
};

// Files the sort stage threw out. Counted separately from parse failures
// because they never become statements at all: a drop whose filenames are all
// malformed produces zero statements AND zero parse failures, and without this
// it reported a clean "Done".
const sortProblemCount = (u) => {
  const p = u.progress || {};
  return (p.sort_unparseable || 0) + (p.sort_unpaired || 0) + (p.sort_duplicates || 0);
};

// One upload -> what the admin needs to know about it right now.
const describe = (u) => {
  const p = u.progress || {};

  // Mid-transfer and nothing arriving. The files already sent are kept, so the
  // answer is to re-drop them rather than start over — say that, rather than
  // leaving a spinner implying it is still working.
  if (u.receiving && u.status !== 'done' && u.status !== 'failed') {
    // last_batch_at only exists once a batch has landed. Fall back to the
    // open time, or an upload whose browser died before its very first batch
    // would sit on 'Transferring' forever — the one case with nothing at all
    // to show for it, and so the most confusing.
    const clock = parseServerTime(u.last_batch_at || u.uploaded_at);
    const last = clock ? clock.getTime() : null;
    const idleMs = last ? Date.now() - last : null;
    if (idleMs !== null && idleMs > STALLED_AFTER_MS) {
      const mins = Math.floor(idleMs / 60000);
      return {
        kind: 'failed',
        stalled: true,
        label: 'Stalled',
        detail:
          `Nothing received for ${mins >= 1 ? `${mins} min` : 'over a minute'}. ` +
          `The transfer stopped — ${(p.received ?? u.file_count ?? 0).toLocaleString('en-US')} of ` +
          `${(u.expected ?? 0).toLocaleString('en-US')} files arrived and are kept. ` +
          `Re-drop the same files on the Upload page to carry on from here.`,
      };
    }
  }
  if (u.status === 'failed') {
    return {
      kind: 'failed',
      label: 'Failed',
      problems: 1, // the upload-level error is itself a reportable problem
      // A parked/cancelled upload has no error text — say what it means and
      // what to do, instead of pointing at details that do not exist.
      detail:
        u.error ||
        'Cancelled or interrupted — the files already sent are kept; resume or re-upload from the Upload page.',
    };
  }
  if (u.status === 'done') {
    // "Done" with files rejected along the way is not a clean run, and saying
    // only "2,611 statements ingested" hid the two that never made it.
    const rejected = (p.parse_failed || 0) + sortProblemCount(u);
    return {
      kind: rejected ? 'warned' : 'done',
      label: 'Done',
      detail:
        `${(p.sorted ?? 0).toLocaleString('en-US')} statements ingested` +
        (rejected ? ` · ${rejected.toLocaleString('en-US')} file(s) had problems` : ''),
      problems: rejected,
    };
  }
  if (u.receiving) {
    const total = u.expected;
    return {
      kind: 'active',
      label: 'Transferring',
      detail: total
        ? `${u.file_count.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} files received`
        : `${u.file_count.toLocaleString('en-US')} files received`,
      pct: total ? Math.round((u.file_count / total) * 100) : null,
    };
  }
  if (u.status === 'parsing' && p.parse_total) {
    const parsed = p.parsed ?? 0;
    return {
      kind: 'active',
      label: 'Parsing',
      detail:
        `${parsed.toLocaleString('en-US')} of ${p.parse_total.toLocaleString('en-US')} statements` +
        (p.parse_failed ? ` · ${p.parse_failed} failed` : ''),
      pct: Math.round((parsed / p.parse_total) * 100),
      problems: p.parse_failed || 0,
    };
  }
  if (u.status === 'sorting' || (u.status === 'parsing' && !p.parse_total)) {
    return {
      kind: 'active',
      label: u.status === 'sorting' ? 'Sorting' : 'Preparing parse',
      detail: p.sorted
        ? `${p.sorted.toLocaleString('en-US')} statements in ${p.batches} batch(es)`
        : `${u.file_count.toLocaleString('en-US')} files`,
      pct: null,
    };
  }
  // uploaded + not receiving = finalized, waiting for the worker to claim it
  return { kind: 'active', label: 'Queued', detail: 'Waiting for the ingest worker', pct: null };
};

const IngestActivity = ({ limit = 6, onActiveChange }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState(null); // null = first load
  const [cancelling, setCancelling] = useState({});
  // upload_id -> { loading, error, report }. Fetched on demand: the detail is
  // per-file and a bad 5,000-file drop is a long list, so it has no business
  // riding along on a 5-second poll.
  const [failures, setFailures] = useState({});
  const [expanded, setExpanded] = useState({});
  const [downloading, setDownloading] = useState({});
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) || null;
    } catch {
      return null; // private mode — the panel simply stays open
    }
  });
  const timer = useRef(null);
  const activeRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await listUploads({ limit });
      const rows = res.items || [];
      setItems(rows);
      const anyActive = rows.some((u) => u.status !== 'done' && u.status !== 'failed');
      // Parent pages refresh their own numbers when an ingest finishes.
      if (onActiveChange && activeRef.current !== anyActive) {
        activeRef.current = anyActive;
        onActiveChange(anyActive);
      }
    } catch {
      /* transient — keep showing the last known state rather than flashing */
    }
  }, [limit, onActiveChange]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => clearInterval(timer.current);
  }, [load]);

  const toggleFailures = useCallback(
    async (uploadId) => {
      const open = !expanded[uploadId];
      setExpanded((e) => ({ ...e, [uploadId]: open }));
      if (!open || failures[uploadId]?.report) return; // already have it
      setFailures((f) => ({ ...f, [uploadId]: { loading: true } }));
      try {
        const report = await getUploadFailures(uploadId);
        setFailures((f) => ({ ...f, [uploadId]: { report } }));
      } catch (err) {
        setFailures((f) => ({
          ...f,
          [uploadId]: { error: err?.message || 'Could not load the failure detail' },
        }));
      }
    },
    [expanded, failures]
  );

  const downloadFailures = useCallback(async (uploadId) => {
    setDownloading((d) => ({ ...d, [uploadId]: true }));
    try {
      await downloadUploadFailuresCsv(uploadId);
    } catch {
      /* the on-screen list is still there; a failed download says so below */
    } finally {
      setDownloading((d) => ({ ...d, [uploadId]: false }));
    }
  }, []);

  if (items === null) return null; // nothing to say yet
  if (!items.length) return null; // no uploads ever — stay out of the way

  const signature = signatureOf(items);
  if (dismissed === signature) return null; // closed, and nothing has changed since

  const close = () => {
    setDismissed(signature);
    try {
      localStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* private mode — dismissal lasts for this view only */
    }
  };

  return (
    <section className={styles.panel} aria-label="Ingest activity">
      <div className={styles.head}>
        <span>Ingest activity</span>
        <button
          type="button"
          className={styles.close}
          onClick={close}
          aria-label="Close ingest activity"
          title="Close — reopens if an upload starts or changes"
        >
          <FaTimes size={11} />
        </button>
      </div>
      <ul className={styles.list}>
        {items.map((u) => {
          const d = describe(u);
          return (
            <li
              key={u.upload_id}
              className={styles.row}
              role="button"
              tabIndex={0}
              title="Open the Upload page"
              onClick={() => navigate('/admin/statements/upload')}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/statements/upload')}
            >
              <span className={`${styles.icon} ${styles[d.kind]}`}>
                {d.kind === 'done' && <FaCheck size={11} />}
                {(d.kind === 'failed' || d.kind === 'warned') && <FaExclamationTriangle size={11} />}
                {d.kind === 'active' && <FaSpinner size={11} className={styles.spin} />}
              </span>
              <div className={styles.body}>
                <div className={styles.title}>
                  Upload #{u.upload_id} · {d.label}
                  <span className={styles.time}>started {fmtTime(u.uploaded_at)}</span>
                </div>
                <div className={styles.detail}>{d.detail}</div>
                {d.stalled && (
                  <button
                    type="button"
                    className={styles.giveUp}
                    disabled={!!cancelling[u.upload_id]}
                    onClick={async (e) => {
                      // The row navigates; the button must not.
                      e.stopPropagation();
                      setCancelling((c) => ({ ...c, [u.upload_id]: true }));
                      try {
                        await cancelUpload(u.upload_id);
                        await load();
                      } finally {
                        setCancelling((c) => ({ ...c, [u.upload_id]: false }));
                      }
                    }}
                  >
                    {cancelling[u.upload_id] ? 'Cancelling…' : 'Give up on this upload'}
                  </button>
                )}
                {d.pct != null && (
                  <div className={styles.barTrack} role="progressbar" aria-valuenow={d.pct}>
                    <div className={styles.barFill} style={{ width: `${d.pct}%` }} />
                    <span className={styles.barLabel}>{d.pct}%</span>
                  </div>
                )}

                {/* The failure detail. Everything below was already being
                    recorded by the pipeline and never shown: the panel could
                    say "3 failed" and nothing more, so finding out WHICH
                    three meant reading the server log. */}
                {d.problems > 0 && (
                  <div className={styles.problems}>
                    <button
                      type="button"
                      className={styles.problemsToggle}
                      aria-expanded={!!expanded[u.upload_id]}
                      onClick={(e) => {
                        e.stopPropagation(); // the row navigates; this must not
                        toggleFailures(u.upload_id);
                      }}
                    >
                      {expanded[u.upload_id] ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                      {expanded[u.upload_id] ? 'Hide detail' : 'Show what went wrong'}
                    </button>

                    {expanded[u.upload_id] && (
                      <div className={styles.problemBody} onClick={(e) => e.stopPropagation()}>
                        {failures[u.upload_id]?.loading && <div className={styles.problemNote}>Loading detail…</div>}
                        {failures[u.upload_id]?.error && (
                          <div className={styles.problemNote}>{failures[u.upload_id].error}</div>
                        )}
                        {failures[u.upload_id]?.report && (
                          <>
                            {failures[u.upload_id].report.items.length === 0 ? (
                              <div className={styles.problemNote}>No detail was recorded for this upload.</div>
                            ) : (
                              <>
                                <ul className={styles.problemList}>
                                  {failures[u.upload_id].report.items.slice(0, PROBLEM_PREVIEW).map((f, i) => (
                                    <li
                                      key={`${f.statement_id || f.file || i}-${i}`}
                                      className={styles[`sev_${f.severity}`]}
                                    >
                                      <div className={styles.problemWho}>
                                        {f.account_code
                                          ? `${f.account_code}${f.writer_name ? ` · ${f.writer_name}` : ''}${
                                              f.period_code ? ` · ${f.period_code}` : ''
                                            }`
                                          : f.file || `Upload #${u.upload_id}`}
                                      </div>
                                      <div className={styles.problemWhy}>{f.reason}</div>
                                      <div className={styles.problemFix}>{f.hint}</div>
                                    </li>
                                  ))}
                                </ul>
                                {failures[u.upload_id].report.items.length > PROBLEM_PREVIEW && (
                                  <div className={styles.problemNote}>
                                    Showing {PROBLEM_PREVIEW} of{' '}
                                    {failures[u.upload_id].report.items.length.toLocaleString('en-US')} — download the
                                    full list below.
                                  </div>
                                )}
                              </>
                            )}
                            <button
                              type="button"
                              className={styles.problemDownload}
                              disabled={!!downloading[u.upload_id]}
                              onClick={() => downloadFailures(u.upload_id)}
                            >
                              <FaDownload size={9} />
                              {downloading[u.upload_id] ? 'Preparing…' : 'Download full log (CSV)'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default IngestActivity;
