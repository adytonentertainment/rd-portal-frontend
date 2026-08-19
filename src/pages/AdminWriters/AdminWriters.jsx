import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FaUserPlus, FaSearch, FaPen, FaEnvelope, FaTrash, FaTimes, FaFileExcel, FaSpinner } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { statementsLive } from '../../config/featureFlags';
import { listWriters, getWriter, archiveWriter, bulkRemoveWriters, getRosterSummary } from '../../api/writersAdmin';
import { uploadClientList, applyClientImport } from '../../api/clientImportAdmin';
import { adminBulkInvite } from '../../api/portal';
import { assignUnmatchedToClient } from '../../api/writersAdmin';
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
  // Selection works anywhere in the roster, because onboarding the roster is
  // the whole point of inviting in bulk. The DESTRUCTIVE bulk action stays
  // pinned to the needs-attention view: select-all across 810 clients next to
  // a Remove button is a catastrophic mis-click waiting to happen, while the
  // same gesture next to Invite just sends email.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  // The "did you mean X?" confirmation. Clicking the guess must ASK, never
  // assign: linking the wrong one hands a client's royalties to someone else.
  const [linking, setLinking] = useState(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [confirmInvite, setConfirmInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  // Off by default — re-running the batch to catch newly added addresses
  // must not mail everyone who already has a live link a second time.
  const [resendPending, setResendPending] = useState(false);
  // "Show only who is missing data" — sits with the client / commission-partner
  // filters, because the question is always "missing for WHICH group".
  const [dataGapOnly, setDataGapOnly] = useState(false);
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
        dataGap: dataGapOnly ? true : undefined,
      });
      if (reqId === reqRef.current) setData(res);
    } catch (err) {
      if (reqId === reqRef.current) setError(err?.message || 'Could not load clients.');
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [debounced, page, pageSize, needsFixOnly, dataGapOnly]);

  useEffect(() => {
    load();
  }, [load]);

  // Never carry a selection across a change of what's on screen: a row you can
  // no longer see must not still be armed for deletion.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [needsFixOnly, dataGapOnly, page, pageSize, debounced]);

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

  // Checkboxes anywhere in the live roster; Remove only in the cleanup view.
  const bulkMode = statementsLive;
  const canBulkRemove = needsFixOnly;
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

  // Why each selected client would or wouldn't get mail. Mirrors the order the
  // backend skips in, so the confirmation promises exactly what happens — "412
  // selected" means nothing when 90 of them have no address on file.
  const inviteBucket = (w) => {
    if (w.is_house_account) return 'house';
    if (w.status === 'offboarded') return 'offboarded';
    if (!w.primary_email) return 'noEmail';
    if (w.portal_status === 'active') return 'active';
    if (w.portal_status === 'invited') return 'pending';
    return 'send';
  };
  const buckets = selectedRows.reduce((acc, w) => {
    const b = inviteBucket(w);
    (acc[b] = acc[b] || []).push(w);
    return acc;
  }, {});
  const willEmail = (buckets.send || []).length + (resendPending ? (buckets.pending || []).length : 0);

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

  const handleBulkInvite = async () => {
    setConfirmInvite(false);
    setBulkBusy(true);
    setError(null);
    try {
      const res = await adminBulkInvite([...selectedIds], { resendPending });
      setInviteResult(res);
      clearSelection();
      setResendPending(false);
      await load();
    } catch (err) {
      setError(err?.message || 'Could not send the invites.');
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
            {statementsLive && (
              /* Applies across clients AND commission partners — both are payees,
                 and a partner missing half their data is as much a hole as a
                 client missing all of it. Partial is the one that hides: the
                 roster says "has statements" and only one revenue type arrived. */
              <button
                className={styles.inviteButton}
                style={
                  dataGapOnly
                    ? { background: 'var(--error)' }
                    : { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }
                }
                onClick={() => {
                  setPage(1);
                  setDataGapOnly((v) => !v);
                }}
                title="Payees with no statement data, or only some of the revenue types they are expected to have"
              >
                {dataGapOnly ? 'Showing: missing data' : 'Missing data'}
              </button>
            )}
          </div>

          {error && <div className={styles.pageError}>{error}</div>}

          {bulkMode && selectedIds.size > 0 && (
            <div className={styles.bulkBar}>
              <span className={styles.bulkCount}>
                {selectedIds.size} selected
                {(buckets.noEmail || []).length > 0 && ` · ${(buckets.noEmail || []).length} with no email`}
                {(buckets.active || []).length > 0 && ` · ${(buckets.active || []).length} already in`}
                {(buckets.pending || []).length > 0 && ` · ${(buckets.pending || []).length} invite pending`}
                {canBulkRemove &&
                  selectedHoldingMoney.length > 0 &&
                  ` · ${selectedHoldingMoney.length} hold statement accounts and will be offboarded, not deleted`}
              </span>
              <button className={styles.secondaryBtn} onClick={clearSelection} disabled={bulkBusy}>
                Clear
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => setConfirmInvite(true)}
                disabled={bulkBusy || willEmail === 0}
                title={
                  willEmail === 0
                    ? 'None of the selected clients can be emailed — see the counts on the left'
                    : 'Email each selected client an invite to their portal'
                }
              >
                {bulkBusy ? 'Working…' : `Invite ${willEmail}`}
              </button>
              {canBulkRemove && (
                <button className={styles.dangerBtn} onClick={() => setConfirmBulk(true)} disabled={bulkBusy}>
                  {bulkBusy ? 'Removing…' : `Remove ${selectedIds.size}`}
                </button>
              )}
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
                              className={`${styles.pill} ${styles.pillBlocking}`}
                              style={{ marginLeft: 8 }}
                              title="No client on your list claims this statement account — add them to the client list and re-import, or edit to assign manually"
                            >
                              Unmatched account
                            </span>
                          )}
                          {w.no_statements && !w.is_unmatched && (
                            <span
                              className={`${styles.pill} ${styles.pillBlocking}`}
                              style={{ marginLeft: 8 }}
                              title="On the roster but has no statements — upload one or remove them"
                            >
                              No statements
                            </span>
                          )}
                          {/* The account's own name off the statement filename, plus
                              the closest client to it. A proposal, never applied —
                              a wrong merge sends one client's royalties to another. */}
                          {w.is_unmatched && (w.account_name || w.suggested_client) && (
                            <div className={styles.unmatchedHint}>
                              {w.account_name && <span>Statement name: {w.account_name}</span>}
                              {w.suggested_client && (
                                <button
                                  type="button"
                                  className={styles.suggestLink}
                                  onClick={() => {
                                    setLinkError(null);
                                    setLinking(w);
                                  }}
                                  title={`${Math.round(w.suggested_client.score * 100)}% name match — click to review and confirm`}
                                >
                                  Did you mean {w.suggested_client.name}?
                                </button>
                              )}
                            </div>
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

      {linking && (
        <div className={styles.overlay} onClick={() => !linkBusy && setLinking(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Link this account to {linking.suggested_client.name}?</h3>
            <p className={styles.confirmBody}>
              The statements filed under <strong>{linking.account_name || linking.canonical_name}</strong> would become{' '}
              <strong>{linking.suggested_client.name}</strong>&apos;s — visible to them in their portal, and counted as
              theirs from now on.
            </p>
            <p className={styles.linkMatchNote}>
              Matched on name only, {Math.round(linking.suggested_client.score * 100)}% similar. Nothing else has been
              checked — if these are two different people, linking them sends one client&apos;s royalties to the other.
            </p>
            {linkError && <div className={styles.formError}>{linkError}</div>}
            <div className={styles.confirmActions}>
              <button className={styles.secondaryBtn} onClick={() => setLinking(null)} disabled={linkBusy}>
                No, leave it unmatched
              </button>
              <button
                className={styles.primaryBtn}
                disabled={linkBusy}
                onClick={async () => {
                  setLinkBusy(true);
                  setLinkError(null);
                  try {
                    await assignUnmatchedToClient(linking.id, linking.suggested_client.id);
                    setLinking(null);
                    await load();
                  } catch (err) {
                    setLinkError(err?.message || 'Could not link that account.');
                  } finally {
                    setLinkBusy(false);
                  }
                }}
              >
                {linkBusy ? 'Linking…' : `Yes, it's ${linking.suggested_client.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmInvite && (
        <div className={styles.overlay} onClick={() => setConfirmInvite(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Email {willEmail} client(s) an invite?</h3>
            <p className={styles.confirmBody}>
              Each one gets a single email at their primary contact address, in their own language, with a link that
              expires in 14 days. Sending is paced, so a large batch takes a few minutes to go out.
            </p>
            {((buckets.noEmail || []).length > 0 ||
              (buckets.active || []).length > 0 ||
              (buckets.pending || []).length > 0 ||
              (buckets.house || []).length > 0 ||
              (buckets.offboarded || []).length > 0) && (
              <p className={styles.confirmBody}>
                Not emailed:{' '}
                {[
                  (buckets.noEmail || []).length && `${buckets.noEmail.length} with no address on file`,
                  (buckets.active || []).length && `${buckets.active.length} already using the portal`,
                  !resendPending && (buckets.pending || []).length && `${buckets.pending.length} already invited`,
                  (buckets.house || []).length && `${buckets.house.length} house account(s)`,
                  (buckets.offboarded || []).length && `${buckets.offboarded.length} offboarded`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                .
              </p>
            )}
            {(buckets.pending || []).length > 0 && (
              <label className={styles.confirmBody} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={resendPending} onChange={(e) => setResendPending(e.target.checked)} />
                <span>
                  Also re-send to the {buckets.pending.length} with an invite already pending — for the spam-folder
                  case. This issues a new link and the old one stops working.
                </span>
              </label>
            )}
            <div className={styles.confirmActions}>
              <button className={styles.secondaryBtn} onClick={() => setConfirmInvite(false)}>
                Cancel
              </button>
              <button className={styles.primaryBtn} onClick={handleBulkInvite} disabled={willEmail === 0}>
                Send {willEmail} invite(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteResult && (
        <div className={styles.overlay} onClick={() => setInviteResult(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>{inviteResult.queued.length} invite(s) on their way</h3>
            <p className={styles.confirmBody}>
              They send in the background — the roster shows “Invited” as each one goes out, and any that bounce show
              the reason on that client&apos;s invite dialog.
            </p>
            {inviteResult.skipped.length > 0 && (
              <p className={styles.confirmBody}>
                {/* The skip reasons ARE the work list: fix these, run it again. */}
                {inviteResult.skipped.length} skipped —{' '}
                {Object.entries(
                  inviteResult.skipped.reduce((acc, s) => {
                    acc[s.reason] = (acc[s.reason] || 0) + 1;
                    return acc;
                  }, {})
                )
                  .map(([reason, n]) => `${n} ${reason}`)
                  .join(' · ')}
                .
              </p>
            )}
            <div className={styles.confirmActions}>
              <button className={styles.primaryBtn} onClick={() => setInviteResult(null)}>
                Close
              </button>
            </div>
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
