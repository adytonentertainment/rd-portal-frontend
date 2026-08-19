import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import IngestActivity from '../../components/IngestActivity/IngestActivity';
import {
  FaUpload,
  FaCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPaperPlane,
  FaSearch,
  FaClock,
  FaPlus,
  FaTimes,
  FaSpinner,
  FaUsers,
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import AdminUploadModal from '../../components/AdminUploadModal/AdminUploadModal';
import { useIsAdmin } from '../../utils/auth';
import { getPersona, ADMIN_PERSONA, setPersona } from '../../utils/persona';
import {
  getWriterRoster,
  getRecentUploads,
  distributeWriter,
  distributeAllReady,
  getRosterDocStatus,
  subscribe,
  CURRENT_PERIOD,
  addWriter,
  removeWriter,
  resetDemoState,
} from '../../mocks/distributionState';
import { brand } from '../../config/brand';
import { statementsLive } from '../../config/featureFlags';
import {
  listWriters,
  archiveWriter,
  createWriter,
  resetAllData,
  getRosterSummary,
  distributeAll,
} from '../../api/writersAdmin';
import { getIngestionAudit } from '../../api/statementsAdmin';
import '../Revenue/revenue.css';
import styles from './adminOverview.module.css';

const fmtMoney = (n) =>
  '$' + Math.round(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Per-client statement status. Statement math is NOT audited — this answers one
// question: is everything this client is owed actually in?
//
// Green means complete. Having *a* statement is not the same as having them
// all: a client expecting MECH + PERF + YT who has only YT is still awaiting
// two filings, and showing that green invites distributing a partial period.
// So green requires every expected revenue type to be covered; anything short
// of that is amber with the outstanding types named.
const liveCompleteness = (w) => {
  // An account no client-list row claims. Ranked first: until somebody says who
  // it belongs to, none of the other questions about it can even be asked.
  if (w.isUnmatched) {
    return {
      kind: 'blocking',
      label: 'Unmatched account',
      title: 'No client on your list claims this statement account — assign an owner or add them to the client list',
    };
  }
  if (w.needsInfo) {
    return { kind: 'warn', label: `Needs info: ${(w.missingInfo || []).join(', ')}` };
  }
  // Red, not grey: nothing arrived for this payee, so they are getting nothing
  // this period and the send is gated on it. Grey read as "nothing to do here".
  if (!w.statementCount) return { kind: 'blocking', label: 'No statements' };

  const expected = w.expectedCatalogs || [];
  const covered = new Set(w.coveredCatalogs || []);
  const missing = expected.filter((c) => !covered.has(c));
  if (missing.length) {
    return {
      kind: 'warn',
      label: `Awaiting ${missing.join(', ')}`,
      title: `Has ${[...covered].join(', ') || 'nothing'} · still awaiting ${missing.join(', ')}`,
    };
  }
  return {
    kind: 'ready',
    label: `${w.statementCount} statement${w.statementCount === 1 ? '' : 's'}`,
    title: `Complete — all expected revenue types in (${expected.join(', ')})`,
  };
};

const timeAgo = (iso) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const AdminOverview = () => {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [, force] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmSendLive, setConfirmSendLive] = useState(false);
  const [showAddWriter, setShowAddWriter] = useState(false);
  const [newWriterName, setNewWriterName] = useState('');
  const [deletingWriter, setDeletingWriter] = useState(null);
  const [distributingIds, setDistributingIds] = useState(new Set());
  const [highlightedWriterIds, setHighlightedWriterIds] = useState(new Set());
  const tableRef = useRef(null);

  // Live mode: the roster is the same backend client list the Client Manager
  // shows (active only), so deletes made here or there are consistent. Demo
  // mode keeps the mock distributionState roster untouched.
  const live = statementsLive;
  const [liveRows, setLiveRows] = useState([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [liveLoading, setLiveLoading] = useState(statementsLive);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // The dashboard used to request page 1 only, so 810 clients showed as 100 and
  // the rest were silently unreachable. Paged like the Client Manager.
  // 200 is the backend's hard cap (page_size le=200); asking for more 422s.
  const PAGE_SIZE_OPTIONS = [50, 100, 200];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  // The roster holds clients AND commission partners. Counting them together
  // and calling the result "clients" is what made this page say 876 when the
  // client list holds 810. Default stays 'any' so nothing is hidden from the
  // distribution view; the label just tells the truth about what is counted.
  const [membership, setMembership] = useState('any');
  // True while any upload is transferring/sorting/parsing. Sending is blocked
  // server-side too — this just explains the disabled button.
  const [ingestActive, setIngestActive] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [audit, setAudit] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showIssues, setShowIssues] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!statementsLive) return;
    try {
      setSummary(await getRosterSummary());
    } catch {
      setSummary(null);
    }
    // Ingestion audit: proves the DB still matches the statement files. A
    // failure blocks sending server-side too, so surface it up front.
    try {
      setAudit(await getIngestionAudit());
    } catch {
      setAudit(null);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleSendAll = async () => {
    if (sending) return;
    setSending(true);
    setSendResult(null);
    try {
      // The confirmation modal IS the acknowledgment of the warnings.
      const res = await distributeAll(true);
      setSendResult({ ok: true, ...res });
      loadSummary();
      loadLive();
    } catch (err) {
      setSendResult({ ok: false, message: err?.message || 'Could not send.' });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!live) return undefined;
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      // A new search restarts at the first page — otherwise searching while on
      // page 5 shows an empty table for a query with only 3 results.
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, live]);

  const loadLive = useCallback(async () => {
    if (!live) return;
    setLiveLoading(true);
    try {
      const res = await listWriters({
        page,
        pageSize,
        search: debouncedSearch,
        status: 'active',
        membership,
        includeUnmatched: true,
      });
      setLiveRows(res.items || []);
      setLiveTotal(res.total || 0);
    } catch {
      setLiveRows([]);
      setLiveTotal(0);
    } finally {
      setLiveLoading(false);
    }
  }, [live, debouncedSearch, page, pageSize, membership]);

  useEffect(() => {
    loadLive();
  }, [loadLive]);

  useEffect(() => subscribe(() => force((x) => x + 1)), []);

  // If a writer persona is set, visiting /admin should snap back to admin mode.
  useEffect(() => {
    if (!isAdmin && getPersona() !== ADMIN_PERSONA) {
      setPersona(ADMIN_PERSONA);
      try {
        localStorage.removeItem('selectedClientId');
      } catch {
        /* noop */
      }
      window.location.reload();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    // Render nothing while we reload into admin mode
    return null;
  }

  const writers = getWriterRoster();
  const recent = getRecentUploads();
  const roster = getRosterDocStatus(CURRENT_PERIOD);

  // Name what's outstanding: just the summary PDF, just XLSX detail files, or a
  // mix. `missing` is item-level (per-type XLSX + the one summary PDF).
  const awaitingLabel = (doc) => {
    const n = doc.missing.length;
    if (doc.missingSummaryPdf > 0 && doc.missingXlsx === 0) return 'the Summary PDF';
    if (doc.missingXlsx > 0 && doc.missingSummaryPdf === 0) return `${doc.missingXlsx} XLSX`;
    return `${n} item${n === 1 ? '' : 's'}`;
  };

  const totalPages = Math.max(1, Math.ceil(liveTotal / pageSize));

  // Say exactly what is being counted. "876 active clients" was wrong: that
  // figure is every active payee — 810 clients plus 65 commission partners who
  // are not on the client list (13 more are on both).
  const MEMBERSHIPS = [
    { value: 'any', label: 'All payees' },
    { value: 'client', label: 'Clients' },
    { value: 'commission_partner', label: 'Commission partners' },
  ];
  const rosterLabel = (() => {
    const n = liveTotal.toLocaleString();
    if (membership === 'client') return `${n} client${liveTotal === 1 ? '' : 's'}`;
    if (membership === 'commission_partner') {
      return `${n} commission partner${liveTotal === 1 ? '' : 's'}`;
    }
    const clients = summary?.client_count;
    const partners = summary?.commission_partner_count;
    return clients != null
      ? `${n} active payees · ${clients.toLocaleString()} clients · ${partners} commission partners`
      : `${n} active payees`;
  })();

  const totalPending = writers.reduce((s, w) => s + w.pending, 0);
  const totalReady = writers.filter((w) => w.ready).reduce((s, w) => s + w.pending, 0);

  const filtered = writers.filter((w) => (!search ? true : w.name.toLowerCase().includes(search.toLowerCase())));

  // Unified rows the table renders: live backend clients (shared with the
  // Client Manager, so deletes stay consistent) or the demo roster. Live rows
  // carry only what the live API exposes; demo-only columns (pending royalties,
  // distribute) are hidden for them.
  const rows = live
    ? liveRows.map((w) => ({
        id: w.id,
        name: w.canonical_name,
        color: 'var(--accent)',
        worksCount: w.account_count,
        live: true,
        liveStatus: w.status,
        portal: w.portal_status,
        primaryEmail: w.primary_email,
        receivedCatalogs: w.received_catalogs || [],
        coveredCatalogs: w.covered_catalogs || [],
        expectedCatalogs: w.expected_catalogs || [],
        needsInfo: w.needs_info,
        missingInfo: w.missing_info || [],
        isUnmatched: w.is_unmatched,
        accountName: w.account_name,
        suggestedClient: w.suggested_client,
        statementCount: w.statement_count || 0,
        pairedCount: w.paired_count || 0,
        reconciledCount: w.reconciled_count || 0,
        pending: 0,
        ready: false,
        missingSources: [],
        docStatus: { missing: [] },
        lastDistributedAt: null,
      }))
    : filtered;

  const handleDistribute = (w) => {
    if (!w.ready || distributingIds.has(w.id)) return;
    setDistributingIds((prev) => new Set(prev).add(w.id));
    setTimeout(() => {
      distributeWriter(w.id);
      setDistributingIds((prev) => {
        const next = new Set(prev);
        next.delete(w.id);
        return next;
      });
    }, 500);
  };

  const handleDistributeAll = () => {
    distributeAllReady();
    setConfirmAll(false);
  };

  const handleAddWriter = () => {
    const name = newWriterName.trim();
    if (!name) return;
    // Check if writer already exists (case-insensitive)
    const existing = writers.find((w) => w.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      // Close modal and highlight existing row
      setShowAddWriter(false);
      setNewWriterName('');
      setHighlightedWriterIds(new Set([existing.id]));
      // Scroll to row
      setTimeout(() => {
        const row = tableRef.current?.querySelector(`[data-writer-id="${existing.id}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      // Clear highlight after 1.5s
      setTimeout(() => setHighlightedWriterIds(new Set()), 1500);
      return;
    }
    if (live) {
      createWriter({ canonical_name: name })
        .then(() => {
          setNewWriterName('');
          setShowAddWriter(false);
          loadLive();
        })
        .catch((err) => toast.error(err?.message || 'Could not add client'));
      return;
    }
    addWriter({ name });
    setNewWriterName('');
    setShowAddWriter(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingWriter) return;
    if (live) {
      // Backend soft-remove (archive → offboarded); the client drops out of
      // BOTH this roster and the Client Manager (both list active only).
      archiveWriter(deletingWriter.id)
        .then(() => {
          setDeletingWriter(null);
          loadLive();
        })
        .catch((err) => toast.error(err?.message || 'Could not remove client'));
      return;
    }
    removeWriter(deletingWriter.id);
    setDeletingWriter(null);
  };

  const handleResetAll = () => {
    if (resetting) return;
    setResetting(true);
    resetAllData()
      .then(() => {
        toast.success('All client & statement data cleared');
        setConfirmReset(false);
        loadLive();
      })
      .catch((err) => toast.error(err?.message || 'Could not reset data'))
      .finally(() => setResetting(false));
  };

  return (
    <>
      <Helmet>
        <title>Writers · {brand.publisherName}</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          {live && (
            <IngestActivity
              onActiveChange={(active) => {
                setIngestActive(active);
                if (!active) {
                  loadSummary();
                  loadLive();
                }
              }}
            />
          )}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Writers</h1>
              {live ? (
                <p className={styles.subtitle}>
                  {liveLoading ? 'Loading roster…' : rosterLabel}
                  {!liveLoading && liveTotal > rows.length && (
                    <>
                      {' · showing first '}
                      {rows.length}
                      {' · '}
                      <button
                        type="button"
                        onClick={() => navigate('/admin/writers')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 'inherit',
                        }}
                      >
                        see all in Client Manager
                      </button>
                    </>
                  )}
                  {!liveLoading && liveTotal <= rows.length && ' · shared with the Client Manager'}
                </p>
              ) : (
                <p className={styles.subtitle}>
                  {writers.length} writers · {fmtMoney(totalPending)} pending across the roster ·{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm('Reset all demo state? This clears uploads, distributions and roster edits.')
                      ) {
                        resetDemoState();
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Reset demo data
                  </button>
                </p>
              )}
            </div>
            <div className={styles.headerActions}>
              <button className={styles.secondaryBtn} onClick={() => navigate('/admin/writers')}>
                <FaUsers size={11} /> Manage clients
              </button>
              <button className={styles.secondaryBtn} onClick={() => setShowAddWriter(true)}>
                <FaPlus size={11} /> Add {live ? 'client' : 'writer'}
              </button>
              <button className={styles.secondaryBtn} onClick={() => setShowUpload(true)}>
                <FaUpload size={11} /> Upload statements
              </button>
              {live && (
                <button
                  className={styles.secondaryBtn}
                  style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                  onClick={() => setConfirmReset(true)}
                  title="Testing only: wipe all clients & statement data"
                >
                  <FaTimes size={11} /> Delete all data
                </button>
              )}
              {/* Distribution in live mode runs through the batch gate flow, not
                  the demo per-writer distribute — so hide the demo action live. */}
              {!live && (
                <button
                  className={styles.primaryBtn}
                  onClick={() => setConfirmAll(true)}
                  disabled={totalReady === 0}
                  title={totalReady === 0 ? 'Nothing ready to distribute' : ''}
                >
                  <FaPaperPlane size={11} /> Distribute all ready ({fmtMoney(totalReady)})
                </button>
              )}
            </div>
          </div>

          {live && summary && (
            <div className={styles.summaryBar}>
              <div className={styles.summaryCards}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Ready to send</span>
                  <span className={styles.summaryValue}>{fmtMoney(summary.pending_amount)}</span>
                  <span className={styles.summaryHint}>
                    {summary.pending_statements.toLocaleString()} statements not yet shared
                    {summary.total_amount != null &&
                      ` · of ${fmtMoney(summary.total_amount)} total (${fmtMoney(
                        summary.held_amount || 0
                      )} held unmatched · ${fmtMoney(summary.house_amount || 0)} house)`}
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Active clients</span>
                  <span className={styles.summaryValue}>
                    {(summary.client_count ?? summary.active_clients).toLocaleString()}
                  </span>
                  <span className={styles.summaryHint}>
                    {summary.commission_partner_count != null &&
                      `${summary.commission_partner_count} commission partners · `}
                    {summary.portal_active} claimed their portal
                  </span>
                </div>
                <button
                  type="button"
                  className={`${styles.summaryCard} ${styles.summaryCardBtn} ${summary.blockers.length ? styles.summaryCardWarn : styles.summaryCardOk}`}
                  onClick={() =>
                    (summary.blockers.length || summary.warnings?.length) && navigate('/admin/writers?fix=1')
                  }
                  disabled={!summary.blockers.length && !summary.warnings?.length}
                >
                  <span className={styles.summaryLabel}>To fix before sending</span>
                  <span className={styles.summaryValue}>
                    {(summary.needs_info || 0) +
                      (summary.clients_without_statements || 0) +
                      (summary.unmatched_accounts || 0)}
                  </span>
                  <span className={styles.summaryHint}>
                    {summary.blockers.length || summary.warnings?.length
                      ? `${[...summary.blockers, ...(summary.warnings || [])].join(' · ')} — click to review`
                      : 'All clear — ready to send'}
                  </span>
                </button>
              </div>
              <div className={styles.summaryAction}>
                <button
                  className={styles.sendAllBtn}
                  disabled={!summary.ready_to_send || sending || audit?.ok === false || ingestActive}
                  onClick={() => setConfirmSendLive(true)}
                  title={
                    ingestActive
                      ? 'Statements are still ingesting — sending unlocks when parsing finishes'
                      : audit?.ok === false
                        ? 'Ingestion audit failed — statements do not match the source files'
                        : summary.ready_to_send
                          ? 'Publish every ready statement to client portals'
                          : summary.blockers.join(' · ') || 'Nothing staged to send'
                  }
                >
                  <FaPaperPlane size={12} />
                  {sending ? 'Sending…' : 'Send statement data to all clients'}
                </button>
                {audit && (
                  <span
                    className={styles.summaryHint}
                    style={{ color: audit.ok ? 'var(--success, #22c55e)' : '#ef4444' }}
                    title={
                      audit.ok
                        ? `Verified ${audit.checked?.statements?.toLocaleString?.() ?? ''} statements against the source files`
                        : JSON.stringify(audit.violation_counts)
                    }
                  >
                    {audit.ok ? (
                      <>
                        <FaCheckCircle size={11} /> Ingestion audit passed
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle size={11} /> Ingestion audit failed —{' '}
                        {Object.values(audit.violation_counts || {}).reduce((a, b) => a + b, 0)} issue(s)
                      </>
                    )}
                  </span>
                )}
                {(summary.needs_info || 0) +
                  (summary.clients_without_statements || 0) +
                  (summary.unmatched_accounts || 0) >
                  0 && (
                  <button className={styles.reviewLink} onClick={() => navigate('/admin/writers?fix=1')}>
                    Fix{' '}
                    {(summary.needs_info || 0) +
                      (summary.clients_without_statements || 0) +
                      (summary.unmatched_accounts || 0)}{' '}
                    — missing info, statements, or unmatched accounts →
                  </button>
                )}
              </div>
            </div>
          )}

          {!live &&
            (roster.awaiting > 0 ? (
              <div className={styles.banner}>
                <FaExclamationTriangle />
                <span>
                  {CURRENT_PERIOD} ·{' '}
                  <strong>
                    {roster.complete}/{roster.total}
                  </strong>{' '}
                  writers have all statements in · <strong>{roster.awaiting}</strong> still awaiting filings
                </span>
              </div>
            ) : (
              <div className={styles.bannerReady}>
                <FaCheck />
                <span>{CURRENT_PERIOD} complete · every writer has all required statements. Ready to distribute.</span>
              </div>
            ))}

          <div className={styles.searchRow}>
            <div className={styles.search}>
              <FaSearch size={11} />
              <input
                type="text"
                placeholder="Search writers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {live && (
              <div className={styles.membershipFilter}>
                {MEMBERSHIPS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`${styles.pageButton} ${membership === m.value ? styles.pageButtonActive : ''}`}
                    onClick={() => {
                      setPage(1);
                      setMembership(m.value);
                    }}
                    disabled={liveLoading}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table} ref={tableRef}>
              <thead>
                {live ? (
                  <tr>
                    <th>Client</th>
                    <th>Accounts</th>
                    <th>Statements</th>
                    <th>Contact</th>
                    <th>Portal</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Writer</th>
                    <th>Works</th>
                    <th>Pending royalties</th>
                    <th>Status</th>
                    <th>Last distributed</th>
                    <th />
                  </tr>
                )}
              </thead>
              <tbody>
                {live && liveLoading && (
                  <tr>
                    <td colSpan={5} className={styles.numSoft} style={{ textAlign: 'center', padding: '28px' }}>
                      Loading clients…
                    </td>
                  </tr>
                )}
                {live && !liveLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.numSoft} style={{ textAlign: 'center', padding: '28px' }}>
                      {debouncedSearch ? `No clients match “${debouncedSearch}”.` : 'No clients yet.'}
                    </td>
                  </tr>
                )}
                {rows.map((w) => (
                  <tr
                    key={w.id}
                    data-writer-id={w.id}
                    onClick={() => navigate(`/admin/writers/${w.id}`)}
                    className={`${styles.row} ${highlightedWriterIds.has(w.id) ? styles.rowHighlight : ''}`}
                  >
                    <td>
                      <span className={styles.writerCell}>
                        <span className={styles.dot} style={{ background: w.color }} />
                        <span className={styles.writerName}>{w.name}</span>
                        <button
                          className={styles.deleteWriterBtn}
                          title={`Delete ${w.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingWriter(w);
                          }}
                        >
                          <FaTimes size={9} />
                        </button>
                      </span>
                    </td>
                    {w.live ? (
                      <>
                        <td className={styles.num}>{w.worksCount}</td>
                        <td>
                          {(() => {
                            const c = liveCompleteness(w);
                            const cls =
                              c.kind === 'ready'
                                ? styles.statusReady
                                : c.kind === 'warn'
                                  ? styles.statusWarn
                                  : c.kind === 'blocking'
                                    ? styles.statusBlocking
                                    : styles.statusIdle;
                            return (
                              <span
                                className={`${styles.status} ${cls}`}
                                title={
                                  c.title ||
                                  (w.receivedCatalogs?.length
                                    ? `Has data for: ${w.receivedCatalogs.join(', ')}`
                                    : 'No statement data yet')
                                }
                              >
                                {c.kind === 'ready' && <FaCheck size={9} />}
                                {c.kind === 'warn' && <FaClock size={9} />}
                                {c.kind === 'blocking' && <FaExclamationTriangle size={9} />}
                                {c.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className={styles.numSoft}>{w.primaryEmail || '—'}</td>
                        <td>
                          <span
                            className={`${styles.status} ${
                              w.portal === 'active'
                                ? styles.statusReady
                                : w.portal === 'invited'
                                  ? styles.statusWarn
                                  : styles.statusIdle
                            }`}
                          >
                            {w.portal === 'active' ? 'Portal active' : w.portal === 'invited' ? 'Invited' : 'No portal'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={styles.num}>{w.worksCount}</td>
                        <td className={styles.numBold}>{fmtMoney(w.pending)}</td>
                        <td>
                          {w.pending === 0 ? (
                            <span className={`${styles.status} ${styles.statusIdle}`}>Idle</span>
                          ) : w.ready ? (
                            <span className={`${styles.status} ${styles.statusReady}`}>
                              <FaCheck size={9} /> Ready
                            </span>
                          ) : (
                            <span
                              className={`${styles.status} ${styles.statusWarn}`}
                              title={`Awaiting ${w.missingSources.join(', ')}`}
                            >
                              <FaClock size={9} /> Awaiting {awaitingLabel(w.docStatus)}
                            </span>
                          )}
                        </td>
                        <td className={styles.numSoft}>{timeAgo(w.lastDistributedAt)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className={styles.distributeBtn}
                            onClick={() => handleDistribute(w)}
                            disabled={!w.ready || distributingIds.has(w.id)}
                            title={
                              w.pending === 0
                                ? 'Nothing pending'
                                : w.missingSources.length > 0
                                  ? `Awaiting ${w.missingSources.join(', ')} for ${CURRENT_PERIOD}`
                                  : ''
                            }
                          >
                            {distributingIds.has(w.id) ? (
                              <>
                                <FaSpinner size={10} className={styles.spinner} /> Distributing...
                              </>
                            ) : w.ready ? (
                              <>
                                <FaPaperPlane size={10} /> Distribute {fmtMoney(w.pending)}
                              </>
                            ) : w.pending === 0 ? (
                              'Up to date'
                            ) : (
                              'Awaiting statements'
                            )}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {live && liveTotal > 0 && (
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
                    disabled={liveLoading}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                className={styles.pageButton}
                disabled={page <= 1 || liveLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages} · {rosterLabel}
              </span>
              <button
                className={styles.pageButton}
                disabled={page >= totalPages || liveLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}

          {!live && (
            <section className={styles.recentCard}>
              <div className={styles.recentHeader}>
                <span className={styles.recentTitle}>Recent uploads</span>
              </div>
              <ul className={styles.recentList}>
                {recent.map((u) => {
                  const matchPct = Math.round((u.matched / u.lines) * 100);
                  return (
                    <li key={u.id} className={styles.recentItem}>
                      <span className={styles.recentSource}>{u.source}</span>
                      <span className={styles.recentPeriod}>{u.period}</span>
                      <span className={styles.recentLines}>{u.lines.toLocaleString()} lines</span>
                      <span className={styles.recentMatch}>
                        {u.matched.toLocaleString()} auto-matched ({matchPct}%)
                      </span>
                      <span className={styles.recentTime}>{timeAgo(u.uploadedAt)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </main>
      </div>

      <AdminUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onComplete={(data) => {
          if (live) {
            // Backend ingest created/attached real clients — pull the fresh roster.
            toast.success(`${data.filesCount} statement${data.filesCount === 1 ? '' : 's'} ingested`, {
              autoClose: 4000,
            });
            loadLive();
            return;
          }
          const parts = [`${data.filesCount} statement${data.filesCount === 1 ? '' : 's'} ingested`];
          if (data.newWritersCreated > 0) {
            parts.push(`${data.newWritersCreated} writer${data.newWritersCreated === 1 ? '' : 's'} created`);
          }
          parts.push(`${fmtMoney(data.total)} added to pending`);
          toast.success(parts.join(' · '), { autoClose: 4000 });
          // Highlight newly created writers for 2s
          if (data.newWriterIds && data.newWriterIds.length > 0) {
            setHighlightedWriterIds(new Set(data.newWriterIds));
            setTimeout(() => setHighlightedWriterIds(new Set()), 2000);
          }
        }}
      />

      {confirmSendLive && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmSendLive(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Send statements to all clients?</div>
            <div className={styles.confirmBody}>
              This shares every ready statement to client portals immediately — clients will be able to view and
              download them. It does not move any money.
              {summary.pending_statements > 0 &&
                ` ${summary.pending_statements.toLocaleString()} statement${
                  summary.pending_statements === 1 ? '' : 's'
                } covering ${fmtMoney(summary.pending_amount)} in royalties.`}
            </div>
            {summary.unmatched_accounts > 0 && (
              <div className={styles.sendWarning}>
                <FaExclamationTriangle size={14} />
                <div>
                  <strong>
                    {summary.unmatched_accounts.toLocaleString()} statement account
                    {summary.unmatched_accounts === 1 ? '' : 's'} match no client on your list
                  </strong>{' '}
                  — their money is held back, not sent, until you assign them.
                </div>
              </div>
            )}
            {summary.clients_without_statements > 0 && (
              <div className={styles.sendWarning}>
                <FaExclamationTriangle size={14} />
                <div>
                  <strong>
                    {summary.clients_without_statements.toLocaleString()} client
                    {summary.clients_without_statements === 1 ? '' : 's'} have no statement this period
                  </strong>{' '}
                  and won&apos;t receive anything:
                  <div className={styles.sendWarningNames}>
                    {(summary.issues?.no_statements || [])
                      .slice(0, 8)
                      .map((c) => c.name)
                      .join(', ')}
                    {summary.clients_without_statements > 8 &&
                      ` +${(summary.clients_without_statements - 8).toLocaleString()} more`}
                  </div>
                </div>
              </div>
            )}
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmSendLive(false)}>
                Cancel
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  setConfirmSendLive(false);
                  handleSendAll();
                }}
              >
                <FaPaperPlane size={11} />{' '}
                {(summary.clients_without_statements || 0) + (summary.unmatched_accounts || 0) > 0
                  ? 'Send anyway'
                  : 'Send to all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAll && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmAll(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Distribute to all ready writers?</div>
            <div className={styles.confirmBody}>
              {writers.filter((w) => w.ready).length} writers will receive a combined {fmtMoney(totalReady)}. Statements
              will appear in each writer's portal immediately.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmAll(false)}>
                Cancel
              </button>
              <button className={styles.primaryBtn} onClick={handleDistributeAll}>
                <FaPaperPlane size={11} /> Distribute {fmtMoney(totalReady)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddWriter && (
        <div className={styles.confirmOverlay} onClick={() => setShowAddWriter(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Add a writer</div>
            <div className={styles.confirmBody}>Create a writer to receive statements and distributions.</div>
            <input
              type="text"
              autoFocus
              value={newWriterName}
              placeholder="Writer name (e.g. RedZed)"
              onChange={(e) => setNewWriterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWriter()}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                color: 'var(--text)',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 16,
              }}
            />
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setShowAddWriter(false)}>
                Cancel
              </button>
              <button className={styles.primaryBtn} onClick={handleAddWriter} disabled={!newWriterName.trim()}>
                <FaPlus size={11} /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showIssues && summary && (
        <div className={styles.confirmOverlay} onClick={() => setShowIssues(false)}>
          <div className={styles.issuesModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.issuesHeader}>
              <div className={styles.confirmTitle}>Fix before sending</div>
              <button className={styles.issuesClose} onClick={() => setShowIssues(false)} aria-label="Close">
                <FaTimes />
              </button>
            </div>
            <div className={styles.issuesBody}>
              {summary.issues?.needs_info?.length > 0 && (
                <>
                  <div className={styles.issuesSection}>
                    Clients missing info ({summary.needs_info})
                    <span className={styles.issuesSub}>Add their revenue type / cadence, or remove them.</span>
                  </div>
                  {summary.issues.needs_info.map((c) => (
                    <div key={`ni${c.id}`} className={styles.issueRow}>
                      <span className={styles.issueName}>{c.name}</span>
                      <span className={styles.issueMeta}>missing: {(c.missing || []).join(', ')}</span>
                      <button className={styles.issueFixBtn} onClick={() => navigate(`/admin/writers/${c.id}`)}>
                        Fix →
                      </button>
                    </div>
                  ))}
                </>
              )}
              {summary.issues?.no_statements?.length > 0 && (
                <>
                  <div className={styles.issuesSection}>
                    Clients with no statements ({summary.clients_without_statements})
                    <span className={styles.issuesSub}>
                      {summary.duplicate_rows > 0
                        ? `${summary.duplicate_rows} are duplicate rows in your client list (the statements are on the other row) — the rest simply had no earnings this period.`
                        : 'These clients simply had no earnings this period.'}
                    </span>
                  </div>
                  {summary.issues.no_statements.map((c) => (
                    <div key={`ns${c.id}`} className={styles.issueRow}>
                      <span className={styles.issueName}>{c.name}</span>
                      <span className={styles.issueMeta}>
                        {c.reason === 'duplicate_row'
                          ? `duplicate list row — statements are on “${c.duplicate_of}”`
                          : 'no earnings this period'}
                      </span>
                      <button className={styles.issueFixBtn} onClick={() => navigate(`/admin/writers/${c.id}`)}>
                        Open →
                      </button>
                    </div>
                  ))}
                </>
              )}
              {summary.issues?.unmatched_accounts?.length > 0 && (
                <>
                  <div className={styles.issuesSection}>
                    Unmatched statement accounts ({summary.unmatched_accounts})
                    <span className={styles.issuesSub}>
                      Money arrived for names not on your client list — add them to the list and re-import, or assign
                      them manually.
                    </span>
                  </div>
                  {summary.issues.unmatched_accounts.map((c) => (
                    <div key={`ua${c.account_code}`} className={styles.issueRow}>
                      <span className={styles.issueName}>{c.name}</span>
                      <span className={styles.issueMeta}>{c.account_code}</span>
                      <button className={styles.issueFixBtn} onClick={() => navigate(`/admin/writers/${c.writer_id}`)}>
                        Open →
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.primaryBtn} onClick={() => setShowIssues(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {sendResult && (
        <div className={styles.confirmOverlay} onClick={() => setSendResult(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>{sendResult.ok ? 'Statements sent' : 'Could not send'}</div>
            {sendResult.ok ? (
              <div className={styles.confirmBody}>
                Published <strong>{sendResult.sent_batches}</strong> batch{sendResult.sent_batches === 1 ? '' : 'es'} to
                client portals.
                {sendResult.skipped_batches > 0 && ` ${sendResult.skipped_batches} batch(es) were skipped (not ready).`}
              </div>
            ) : (
              <div className={styles.confirmBody} style={{ color: 'var(--error)' }}>
                {sendResult.message}
              </div>
            )}
            <div className={styles.confirmActions}>
              <button className={styles.primaryBtn} onClick={() => setSendResult(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReset && (
        <div className={styles.confirmOverlay} onClick={() => !resetting && setConfirmReset(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Delete ALL data?</div>
            <div className={styles.confirmBody}>
              Testing reset. This permanently wipes every client, beneficiary account, statement, upload, distribution,
              contact, portal invite, and client import from the database. Your admin login is kept. This cannot be
              undone.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmReset(false)} disabled={resetting}>
                Cancel
              </button>
              <button
                className={styles.primaryBtn}
                style={{ background: 'var(--error)' }}
                onClick={handleResetAll}
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <FaSpinner size={11} className={styles.spinner} /> Deleting…
                  </>
                ) : (
                  <>
                    <FaTimes size={11} /> Yes, delete everything
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingWriter && (
        <div className={styles.confirmOverlay} onClick={() => setDeletingWriter(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>
              {live ? `Remove ${deletingWriter.name}?` : `Are you sure you want to delete ${deletingWriter.name}?`}
            </div>
            {live ? (
              <>
                <div className={styles.confirmBody}>
                  This offboards the client. They drop out of both this roster and the Client Manager. Their statements
                  and distribution history are preserved (this is a soft remove, not a hard delete).
                </div>
              </>
            ) : (
              <>
                <div className={styles.confirmBody}>This will permanently:</div>
                <ul className={styles.confirmList}>
                  <li>Remove {deletingWriter.name} from the writer roster</li>
                  <li>Clear their pending royalties ({fmtMoney(deletingWriter.pending)} not yet distributed)</li>
                  <li>Delete all uploaded statement records and per-period documentation status</li>
                  <li>Remove their distribution history from the admin view and their writer portal</li>
                </ul>
                <div className={styles.confirmBody} style={{ marginTop: 4 }}>
                  This cannot be undone. You can re-add the writer later, but their data will not return.
                </div>
              </>
            )}
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeletingWriter(null)}>
                Cancel
              </button>
              <button
                className={styles.primaryBtn}
                style={{ background: 'var(--error)' }}
                onClick={handleConfirmDelete}
              >
                <FaTimes size={11} /> Yes, delete {deletingWriter.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminOverview;
