import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaExclamationTriangle, FaSpinner, FaTimes } from 'react-icons/fa';
import { listUploads } from '../../api/statementsAdmin';
import styles from './ingestActivity.module.css';

// Live view of every statement upload on the server — transferring, sorting,
// parsing, done, failed. The upload page only ever showed ITS OWN upload, so a
// transfer resumed from another tab (or an ingest running server-side) was
// completely invisible: the admin stared at a dashboard reading $0 with no way
// to tell "nothing is happening" from "2,613 statements are mid-parse".
const POLL_MS = 5000;
const DISMISS_KEY = 'ingestActivityDismissed';

// What the panel is currently reporting. Dismissal is remembered against THIS,
// not forever: closing it means "I have seen this", not "never tell me again".
// A new upload, or one of these changing state, brings the panel back — hiding
// a live ingest permanently would leave the admin staring at a disabled Send
// button with nothing on screen explaining why.
const signatureOf = (rows) => rows.map((u) => `${u.upload_id}:${u.status}`).join('|');

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString();
};

// One upload -> what the admin needs to know about it right now.
const describe = (u) => {
  const p = u.progress || {};
  if (u.status === 'failed') {
    return {
      kind: 'failed',
      label: 'Failed',
      // A parked/cancelled upload has no error text — say what it means and
      // what to do, instead of pointing at details that do not exist.
      detail:
        u.error ||
        'Cancelled or interrupted — the files already sent are kept; resume or re-upload from the Upload page.',
    };
  }
  if (u.status === 'done') {
    return {
      kind: 'done',
      label: 'Done',
      detail: `${(p.sorted ?? 0).toLocaleString()} statements ingested`,
    };
  }
  if (u.receiving) {
    const total = u.expected;
    return {
      kind: 'active',
      label: 'Transferring',
      detail: total
        ? `${u.file_count.toLocaleString()} of ${total.toLocaleString()} files received`
        : `${u.file_count.toLocaleString()} files received`,
      pct: total ? Math.round((u.file_count / total) * 100) : null,
    };
  }
  if (u.status === 'parsing' && p.parse_total) {
    const parsed = p.parsed ?? 0;
    return {
      kind: 'active',
      label: 'Parsing',
      detail:
        `${parsed.toLocaleString()} of ${p.parse_total.toLocaleString()} statements` +
        (p.parse_failed ? ` · ${p.parse_failed} failed` : ''),
      pct: Math.round((parsed / p.parse_total) * 100),
    };
  }
  if (u.status === 'sorting' || (u.status === 'parsing' && !p.parse_total)) {
    return {
      kind: 'active',
      label: u.status === 'sorting' ? 'Sorting' : 'Preparing parse',
      detail: p.sorted
        ? `${p.sorted.toLocaleString()} statements in ${p.batches} batch(es)`
        : `${u.file_count.toLocaleString()} files`,
      pct: null,
    };
  }
  // uploaded + not receiving = finalized, waiting for the worker to claim it
  return { kind: 'active', label: 'Queued', detail: 'Waiting for the ingest worker', pct: null };
};

const IngestActivity = ({ limit = 6, onActiveChange }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState(null); // null = first load
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
                {d.kind === 'failed' && <FaExclamationTriangle size={11} />}
                {d.kind === 'active' && <FaSpinner size={11} className={styles.spin} />}
              </span>
              <div className={styles.body}>
                <div className={styles.title}>
                  Upload #{u.upload_id} · {d.label}
                  <span className={styles.time}>started {fmtTime(u.uploaded_at)}</span>
                </div>
                <div className={styles.detail}>{d.detail}</div>
                {d.pct != null && (
                  <div className={styles.barTrack} role="progressbar" aria-valuenow={d.pct}>
                    <div className={styles.barFill} style={{ width: `${d.pct}%` }} />
                    <span className={styles.barLabel}>{d.pct}%</span>
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
