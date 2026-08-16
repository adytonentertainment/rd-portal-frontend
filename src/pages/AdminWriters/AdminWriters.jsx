import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FaUserPlus, FaSearch, FaPen, FaEnvelope, FaTrash, FaTimes, FaFileExcel, FaSpinner } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { statementsLive } from '../../config/featureFlags';
import { listWriters, getWriter, archiveWriter, bulkRemoveWriters, getRosterSummary } from '../../api/writersAdmin';
import { uploadClientList, applyClientImport } from '../../api/clientImportAdmin';
import { getWriterRoster, addWriter, removeWriter } from '../../mocks/distributionState';
import WriterFormModal from './WriterFormModal';
import InviteDialog from './InviteDialog';
import styles from './adminWriters.module.css';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const KIND_LABEL = { client: 'Client', commission_partner: 'Commission partner' };
const kindLabel = (k) => KIND_LABEL[k] || '—';

// "PUB26H1" → "H1 2026"
const fmtPeriod = (pc) => {
  const m = /PUB(\d{2})([HQ])(\d)/i.exec(pc || '');
  return m ? `${m[2].toUpperCase()}${m[3]} 20${m[1]}` : pc || '—';
};
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

const PORTAL_PILL = {
  active: { label: 'Portal active', cls: 'pillActive' },
  invited: { label: 'Invited — not claimed', cls: 'pillInvited' },
  none: { label: 'Not invited', cls: 'pillNone' },
};

// Adapt the 5-writer demo roster into the same row shape the live API returns,
// so the page renders identically at demo scale (no backend). Client-side
// filter + paginate here; the live path does both server-side.
const demoRows = (search, page, pageSize) => {
  const q = search.trim().toLowerCase();
  const all = getWriterRoster()
    .filter((w) => (!q ? true : w.name.toLowerCase().includes(q)))
    .map((w) => ({
      id: w.id,
      canonical_name: w.name,
      payee_name: null,
      kind: null,
      status: 'active',
      cadence: null,
      preferred_language: null,
      expected_catalogs: w.catalog || [],
      primary_email: null,
      contact_emails: [],
      account_count: w.worksCount || 0,
      portal_status: 'none',
    }));
  const total = all.length;
  const items = all.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, page_size: pageSize };
};

const AdminWriters = () => {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formWriter, setFormWriter] = useState(undefined); // undefined=closed, null=create, obj=edit
  const [inviteWriter, setInviteWriter] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // The dashboard's "Fix" link (/admin/writers?fix=1) opens straight into the
  // list of clients that block a send — missing info OR no statements.
  const [searchParams] = useSearchParams();
  // Bulk cleanup lives ONLY in the needs-attention view: that list is the junk
  // and blockers, and offering select-all across the whole 810-client roster
  // invites a catastrophic mis-click.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [needsFixOnly, setNeedsFixOnly] = useState(
    searchParams.get('fix') === '1' || searchParams.get('needs_info') === '1'
  );
  const [roster, setRoster] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { id, apply } | { error }
  const reqRef = useRef(0);
  const fileRef = useRef(null);

  // Import the client-list XLSX/CSV: upload (computes the diff) then apply the
  // exact matches, which fills in payee / revenue type / cadence / language and
  // wires contacts on the matching writers. Probable / near matches don't apply
  // automatically — they land in the resolution queue for that import.
  const handleImportFile = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const up = await uploadClientList(file);
      const applied = await applyClientImport(up.id, file);
      setImportResult({ id: up.id, apply: applied.apply || {}, findings: up.findings_summary });
      load();
    } catch (err) {
      setImportResult({ error: err?.message || 'Could not import the client list.' });
    } finally {
      setImporting(false);
    }
  };

  // Debounce the search box (≥250ms) before hitting the API, and reset to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const reqId = ++reqRef.current;
    if (!statementsLive) {
      const res = demoRows(debounced, page, pageSize);
      if (reqId === reqRef.current) {
        setData(res);
        setLoading(false);
      }
      return;
    }
    try {
      // active only, so a removed (archived/offboarded) client drops out of the
      // list here just as it does on the /admin dashboard — the two stay in sync.
      const res = await listWriters({
        page,
        pageSize,
        search: debounced,
        status: 'active',
        needsFix: needsFixOnly ? true : undefined,
      });
      if (reqId === reqRef.current) setData(res);
    } catch (err) {
      if (reqId === reqRef.current) setError(err?.message || 'Could not load clients.');
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [debounced, page, pageSize, needsFixOnly]);

  useEffect(() => {
    load();
  }, [load]);

  // Never carry a selection across a change of what's on screen: a row you can
  // no longer see must not still be armed for deletion.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [needsFixOnly, page, pageSize, debounced]);

  // Roster totals come from the client list's two sheets (a person on both is
  // counted in each), so they don't equal the table's row count — which also
  // includes accounts not yet matched to any client row.
  useEffect(() => {
    if (!statementsLive) return;
    getRosterSummary()
      .then(setRoster)
      .catch(() => setRoster(null));
  }, [data]);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Checkboxes exist only in the needs-attention cleanup view.
  const bulkMode = statementsLive && needsFixOnly;
  const selectableIds = items.map((w) => w.id);
  const selectedOnPage = selectableIds.filter((id) => selectedIds.has(id));
  const allOnPageSelected = selectableIds.length > 0 && selectedOnPage.length === selectableIds.length;

  const toggleOne = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Select-all covers THIS PAGE only. A checkbox that silently selects 87 rows
  // you cannot see is how bulk deletes go wrong.
  const toggleAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  // What the selection actually contains, so the confirmation can say whether
  // anything holds royalties rather than just counting rows.
  const selectedRows = items.filter((w) => selectedIds.has(w.id));
  const selectedHoldingMoney = selectedRows.filter((w) => (w.account_count || 0) > 0);

  const handleBulkRemove = async () => {
    setConfirmBulk(false);
    setBulkBusy(true);
    setError(null);
    try {
      const res = await bulkRemoveWriters([...selectedIds]);
      setBulkResult(res);
      clearSelection();
      await load();
    } catch (err) {
      setError(err?.message || 'Could not remove the selected clients.');
    } finally {
      setBulkBusy(false);
    }
  };

  const openEdit = async (row) => {
    if (!statementsLive) return; // demo writers have no editable schema
    setBusyId(row.id);
    try {
      const detail = await getWriter(row.id);
      setFormWriter(detail);
    } catch (err) {
      setError(err?.message || 'Could not open client.');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async () => {
    const w = archiving;
    setArchiving(null);
    if (!w) return;
    if (!statementsLive) {
      removeWriter(w.id);
      load();
      return;
    }
    try {
      await archiveWriter(w.id);
      load();
    } catch (err) {
      setError(err?.message || 'Could not remove client.');
    }
  };

  const handleCreated = () => {
    setFormWriter(undefined);
    load();
  };

  // Demo create goes straight through the mock store (no form modal needed).
  const openCreate = () => {
    if (!statementsLive) {
      const name = window.prompt('New client name');
      if (name && name.trim()) {
        addWriter({ name: name.trim() });
        load();
      }
      return;
    }
    setFormWriter(null);
  };

  if (!isAdmin) return <Navigate to="/earnings" replace />;

  return (
    <>
      <Helmet>
        <title>Clients | Admin | RD</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Clients</h1>
              <p className={styles.subtitle}>
                {roster
                  ? `${(roster.client_count ?? 0).toLocaleString()} clients · ${(
                      roster.commission_partner_count ?? 0
                    ).toLocaleString()} commission partners`
                  : total > 0
                    ? `${total.toLocaleString()} on the roster`
                    : 'Manage your roster'}{' '}
                · search, edit, and invite to portal
              </p>
            </div>
            <div style={{ display: 'inline-flex', gap: 10 }}>
              {statementsLive && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      handleImportFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    className={styles.inviteButton}
                    style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}
                    onClick={() => fileRef.current?.click()}
                    disabled={importing}
                    title="Import the client-list spreadsheet (payee, revenue type, cadence, contacts)"
                  >
                    {importing ? <FaSpinner size={13} className={styles.spin} /> : <FaFileExcel size={13} />}
                    {importing ? 'Importing…' : 'Import client list'}
                  </button>
                </>
              )}
              <button className={styles.inviteButton} onClick={openCreate}>
                <FaUserPlus size={14} />
                Add client
              </button>
            </div>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.search}>
              <FaSearch size={11} />
              <input
                type="text"
                placeholder="Search by name, payee, or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className={styles.clearSearch} onClick={() => setSearch('')} aria-label="Clear search">
                  <FaTimes size={10} />
                </button>
              )}
            </div>
            {statementsLive && (
              <button
                className={styles.inviteButton}
                style={
                  needsFixOnly
                    ? { background: 'var(--error)' }
                    : { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }
                }
                onClick={() => {
                  setPage(1);
                  setNeedsFixOnly((v) => !v);
                }}
                title="Clients that block a send — missing client-list info or no statements"
              >
                {needsFixOnly ? 'Showing: needs attention' : 'Needs attention'}
              </button>
            )}
          </div>

          {error && <div className={styles.pageError}>{error}</div>}

          {bulkMode && selectedIds.size > 0 && (
            <div className={styles.bulkBar}>
              <span className={styles.bulkCount}>
                {selectedIds.size} selected
                {selectedHoldingMoney.length > 0 &&
                  ` · ${selectedHoldingMoney.length} hold statement accounts and will be offboarded, not deleted`}
              </span>
              <button className={styles.secondaryBtn} onClick={clearSelection} disabled={bulkBusy}>
                Clear
              </button>
              <button className={styles.dangerBtn} onClick={() => setConfirmBulk(true)} disabled={bulkBusy}>
                {bulkBusy ? 'Removing…' : `Remove ${selectedIds.size}`}
              </button>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {bulkMode && (
                    <th className={styles.checkCell}>
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        // Some-but-not-all reads as "nothing selected" without this.
                        ref={(el) => {
                          if (el) el.indeterminate = selectedOnPage.length > 0 && !allOnPageSelected;
                        }}
                        onChange={toggleAllOnPage}
                        aria-label="Select all on this page"
                        title="Select all on this page"
                      />
                    </th>
                  )}
                  <th>Client</th>
                  <th>Payee</th>
                  <th>Kind</th>
                  <th>Catalogs</th>
                  <th>Contact</th>
                  <th>Accounts</th>
                  <th>Last distributed</th>
                  <th>Portal</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={bulkMode ? 10 : 9} className={styles.stateCell}>
                      Loading clients…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={bulkMode ? 10 : 9} className={styles.stateCell}>
                      {debounced ? `No clients match “${debounced}”.` : 'No clients yet.'}
                    </td>
                  </tr>
                ) : (
                  items.map((w) => {
                    const pill = PORTAL_PILL[w.portal_status] || PORTAL_PILL.none;
                    return (
                      <tr key={w.id} className={w.status === 'offboarded' ? styles.rowMuted : ''}>
                        {bulkMode && (
                          <td className={styles.checkCell} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(w.id)}
                              onChange={() => toggleOne(w.id)}
                              aria-label={`Select ${w.canonical_name}`}
                            />
                          </td>
                        )}
                        <td>
                          <button className={styles.nameLink} onClick={() => navigate(`/admin/writers/${w.id}`)}>
                            {w.canonical_name}
                          </button>
                          {w.needs_info && (
                            <span
                              className={`${styles.pill} ${styles.pillInvited}`}
                              style={{ marginLeft: 8 }}
                              title={`Missing: ${(w.missing_info || []).join(', ')}`}
                            >
                              Needs info
                            </span>
                          )}
                          {w.is_unmatched && (
                            <span
                              className={`${styles.pill} ${styles.pillNone}`}
                              style={{ marginLeft: 8 }}
                              title="No client on your list claims this statement account — add them to the client list and re-import, or edit to assign manually"
                            >
                              Unmatched account
                            </span>
                          )}
                          {w.no_statements && !w.is_unmatched && (
                            <span
                              className={`${styles.pill} ${styles.pillNone}`}
                              style={{ marginLeft: 8 }}
                              title="On the roster but has no statements — upload one or remove them"
                            >
                              No statements
                            </span>
                          )}
                        </td>
                        <td className={styles.soft}>{w.payee_name || '—'}</td>
                        <td className={styles.soft}>{kindLabel(w.kind)}</td>
                        <td className={styles.soft}>
                          {w.expected_catalogs?.length ? w.expected_catalogs.join(', ') : '—'}
                        </td>
                        <td className={styles.soft}>{w.primary_email || '—'}</td>
                        <td className={styles.num}>{w.account_count}</td>
                        <td className={styles.soft}>
                          {w.last_distributed_at ? (
                            <span title={fmtDate(w.last_distributed_at)}>
                              {fmtPeriod(w.last_distributed_period)}
                              <span style={{ color: 'var(--soft-text)' }}> · {fmtDate(w.last_distributed_at)}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--soft-text)' }}>never</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span
                              className={`${styles.pill} ${styles[pill.cls]}`}
                              title={
                                w.portal_status === 'active'
                                  ? 'This client has claimed their portal account and can sign in.'
                                  : w.portal_status === 'invited'
                                    ? "This client has been invited but hasn't claimed their portal account yet."
                                    : 'This client has not been invited to their portal yet.'
                              }
                            >
                              {pill.label}
                            </span>
                            {statementsLive && w.portal_status !== 'active' && (
                              <button
                                className={styles.inviteRowBtn}
                                title="Invite this client to claim their portal account"
                                onClick={() => setInviteWriter(w)}
                              >
                                <FaEnvelope size={10} />
                                {w.portal_status === 'invited' ? 'Re-invite' : 'Invite'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className={styles.actionsCell}>
                          {statementsLive && (
                            <button
                              className={styles.iconBtn}
                              title="Edit"
                              disabled={busyId === w.id}
                              onClick={() => openEdit(w)}
                            >
                              <FaPen size={12} />
                            </button>
                          )}
                          <button className={styles.iconBtnDanger} title="Remove" onClick={() => setArchiving(w)}>
                            <FaTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className={styles.pagination}>
              <div className={styles.pageSizeRow}>
                <span className={styles.pageInfo}>Per page:</span>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    className={`${styles.pageButton} ${pageSize === n ? styles.pageButtonActive : ''}`}
                    onClick={() => {
                      setPage(1);
                      setPageSize(n);
                    }}
                    disabled={loading}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                className={styles.pageButton}
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages} · {total.toLocaleString()} clients
              </span>
              <button
                className={styles.pageButton}
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>

      {formWriter !== undefined && (
        <WriterFormModal writer={formWriter} onClose={() => setFormWriter(undefined)} onSaved={handleCreated} />
      )}

      {inviteWriter && <InviteDialog writer={inviteWriter} onClose={() => setInviteWriter(null)} onChanged={load} />}

      {importResult && (
        <div className={styles.overlay} onClick={() => setImportResult(null)}>
          <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
            <header className={styles.formHeader}>
              <h2 className={styles.formTitle}>{importResult.error ? 'Import failed' : 'Client list imported'}</h2>
              <button className={styles.iconBtn} onClick={() => setImportResult(null)} aria-label="Close">
                <FaTimes />
              </button>
            </header>
            <div className={styles.formBody}>
              {importResult.error ? (
                <div className={styles.formError}>{importResult.error}</div>
              ) : (
                <>
                  <div className={styles.mutedNote}>Exact-name matches were applied. Summary:</div>
                  <ul className={styles.contactList}>
                    {Object.entries(importResult.apply || {})
                      .filter(([k]) => k !== 'findings_summary')
                      .map(([k, v]) => (
                        <li key={k} className={styles.contactRow}>
                          <span className={styles.contactEmail}>{k.replace(/_/g, ' ')}</span>
                          <strong>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</strong>
                        </li>
                      ))}
                  </ul>
                  <div className={styles.mutedNote}>
                    Clients whose names didn’t exactly match (probable / near matches) weren’t auto-applied — resolve
                    them in the import queue.
                  </div>
                </>
              )}
            </div>
            <footer className={styles.formFooter}>
              {!importResult.error && importResult.id && (
                <button
                  className={styles.secondaryBtn}
                  onClick={() => navigate(`/admin/client-imports/${importResult.id}`)}
                >
                  Open resolution queue
                </button>
              )}
              <button className={styles.primaryBtn} onClick={() => setImportResult(null)}>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}

      {confirmBulk && (
        <div className={styles.overlay} onClick={() => setConfirmBulk(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Remove {selectedIds.size} client(s)?</h3>
            <p className={styles.confirmBody}>
              {selectedIds.size - selectedHoldingMoney.length > 0 && (
                <>
                  <strong>{selectedIds.size - selectedHoldingMoney.length}</strong> hold no statement accounts and will
                  be <strong>permanently deleted</strong>.{' '}
                </>
              )}
              {selectedHoldingMoney.length > 0 && (
                <>
                  <strong>{selectedHoldingMoney.length}</strong> hold statement accounts, so they are{' '}
                  <strong>offboarded instead of deleted</strong> — their statements and royalties are kept.
                </>
              )}
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.secondaryBtn} onClick={() => setConfirmBulk(false)}>
                Cancel
              </button>
              <button className={styles.dangerBtn} onClick={handleBulkRemove}>
                Remove {selectedIds.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkResult && (
        <div className={styles.overlay} onClick={() => setBulkResult(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Done</h3>
            <p className={styles.confirmBody}>
              {bulkResult.deleted.length} deleted · {bulkResult.archived.length} offboarded (statements kept)
              {bulkResult.skipped.length > 0 && ` · ${bulkResult.skipped.length} skipped`}
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.primaryBtn} onClick={() => setBulkResult(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {archiving && (
        <div className={styles.overlay} onClick={() => setArchiving(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Remove {archiving.canonical_name}?</h3>
            <p className={styles.confirmBody}>
              This offboards the client (soft-remove). Their statements and distribution history are preserved. Any
              pending portal invites are left as-is.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.secondaryBtn} onClick={() => setArchiving(null)}>
                Cancel
              </button>
              <button className={styles.dangerBtn} onClick={handleArchive}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminWriters;
