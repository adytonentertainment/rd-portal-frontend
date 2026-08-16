import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { getClientImport, getResolutionQueue, resolveQueueRow } from '../../api/clientImportAdmin';
import styles from './adminClientImport.module.css';

const PAGE_SIZE = 25;

const TABS = [
  { key: 'probable', label: 'Probable matches' },
  { key: 'unmatched', label: 'Unmatched rows' },
  { key: 'unlisted', label: 'Unlisted accounts' },
];

// Frontend for the client-import resolution queue (Writer-Scale UX PRD, US-B2).
// The API (getResolutionQueue / resolveQueueRow) is built + tested backend-side;
// this is the page that never existed. Distinct from the upload modal's
// "unassigned" (pre-ingest, filename-local): this resolves POST-ingest accounts
// that ingested but didn't cleanly match a client-list identity.
const AdminClientImport = () => {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { id } = useParams();

  const [record, setRecord] = useState(null);
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('probable');
  const [page, setPage] = useState(1);
  const [manualCodes, setManualCodes] = useState({}); // rowKey → comma string
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rec, q] = await Promise.all([getClientImport(id), getResolutionQueue(id, 'all')]);
      setRecord(rec);
      setQueue(q);
    } catch (err) {
      setError(err?.message || 'Could not load this import.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const rows = useMemo(() => {
    if (!queue) return [];
    if (tab === 'probable') return queue.probable || [];
    if (tab === 'unmatched') return queue.unmatched || [];
    return queue.unlisted_accounts || [];
  }, [queue, tab]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rowKey = (r) => `${r.sheet}::${r.row_no}`;

  const resolve = async (r, accountCodes) => {
    const key = rowKey(r);
    setBusyKey(key);
    setError(null);
    try {
      await resolveQueueRow(id, { sheet: r.sheet, rowNo: r.row_no, accountCodes });
      await load();
    } catch (err) {
      setError(err?.message || 'Could not resolve this row.');
    } finally {
      setBusyKey(null);
    }
  };

  const resolveManual = (r) => {
    const raw = manualCodes[rowKey(r)] || '';
    const codes = raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    resolve(r, codes);
  };

  // Bulk-apply every probable match with its suggested accounts — clears the
  // near-name matches (e.g. "X" vs "X NEW") in one pass.
  const [bulkBusy, setBulkBusy] = useState(false);
  const confirmAllProbable = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    setError(null);
    try {
      const probable = queue?.probable || [];
      for (const r of probable) {
        const codes = r.match?.account_codes || [];
        // eslint-disable-next-line no-await-in-loop
        await resolveQueueRow(id, { sheet: r.sheet, rowNo: r.row_no, accountCodes: codes });
      }
      await load();
    } catch (err) {
      setError(err?.message || 'Could not confirm all matches.');
    } finally {
      setBulkBusy(false);
    }
  };

  if (!isAdmin) return <Navigate to="/earnings" replace />;

  const counts = queue?.counts || { probable: 0, unmatched: 0, unlisted_accounts: 0 };
  const countFor = (key) => (key === 'unlisted' ? counts.unlisted_accounts : counts[key]) || 0;

  return (
    <>
      <Helmet>
        <title>Resolve client import | Admin | RD</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <button className={styles.back} onClick={() => navigate('/admin')}>
            <FaArrowLeft size={12} /> Back to admin
          </button>

          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Resolve client import</h1>
              <p className={styles.subtitle}>
                {record ? (
                  <>
                    {record.filename || `Import #${id}`} · <span className={styles.statusTag}>{record.status}</span>
                  </>
                ) : (
                  `Import #${id}`
                )}
              </p>
            </div>
          </div>

          {error && <div className={styles.pageError}>{error}</div>}

          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className={styles.tabCount}>{countFor(t.key)}</span>
              </button>
            ))}
          </div>

          {tab === 'probable' && rows.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <button className={styles.primaryBtn} disabled={bulkBusy} onClick={confirmAllProbable}>
                {bulkBusy ? 'Confirming…' : `Confirm all ${rows.length} probable matches`}
              </button>
            </div>
          )}

          <div className={styles.card}>
            {loading ? (
              <div className={styles.stateBox}>Loading…</div>
            ) : rows.length === 0 ? (
              <div className={styles.stateBox}>
                {tab === 'probable' && 'No probable matches to confirm.'}
                {tab === 'unmatched' && 'No unmatched client rows — everything matched.'}
                {tab === 'unlisted' && 'No unlisted statement accounts.'}
              </div>
            ) : tab === 'unlisted' ? (
              <ul className={styles.list}>
                {pageRows.map((code) => (
                  <li key={code} className={styles.unlistedRow}>
                    <code className={styles.code}>{code}</code>
                    <span className={styles.soft}>
                      Statement account with no client-list row. Add this code to the matching client in the Unmatched /
                      Probable tabs, or re-import an updated client list.
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className={styles.list}>
                {pageRows.map((r) => {
                  const key = rowKey(r);
                  const busy = busyKey === key;
                  const suggested = r.match?.account_codes || [];
                  return (
                    <li key={key} className={styles.row}>
                      <div className={styles.rowMain}>
                        <div className={styles.rowName}>{r.name || '(no name)'}</div>
                        <div className={styles.rowMeta}>
                          {r.payee_name && r.payee_name !== r.name && <span>payee: {r.payee_name}</span>}
                          {r.kind && <span>{r.kind}</span>}
                          {r.catalogs?.length > 0 && <span>{r.catalogs.join(', ')}</span>}
                          <span className={styles.soft}>
                            {r.sheet} · row {r.row_no}
                          </span>
                        </div>
                        {tab === 'probable' && r.match?.matched && (
                          <div className={styles.suggestBox}>
                            Suggested: <strong>{r.match.matched}</strong>{' '}
                            {r.match.confidence && <span className={styles.confPill}>{r.match.confidence}</span>}
                            {suggested.length > 0 && <span className={styles.soft}> · {suggested.join(', ')}</span>}
                          </div>
                        )}
                      </div>

                      <div className={styles.rowActions}>
                        {tab === 'probable' ? (
                          <button className={styles.primaryBtn} disabled={busy} onClick={() => resolve(r, suggested)}>
                            <FaCheck size={11} /> Confirm
                          </button>
                        ) : (
                          <>
                            <input
                              className={styles.codeInput}
                              placeholder="account codes, comma-separated"
                              value={manualCodes[key] || ''}
                              onChange={(e) => setManualCodes((prev) => ({ ...prev, [key]: e.target.value }))}
                            />
                            <button className={styles.primaryBtn} disabled={busy} onClick={() => resolveManual(r)}>
                              Resolve
                            </button>
                            <button className={styles.secondaryBtn} disabled={busy} onClick={() => resolve(r, [])}>
                              No accounts this period
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageButton} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button className={styles.pageButton} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminClientImport;
