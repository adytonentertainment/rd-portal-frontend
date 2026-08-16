import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate } from 'react-router-dom';
import { FaUpload, FaExclamationTriangle } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { getAdminStatements } from '../../mocks/statementsAdminData';
import { statementsLive } from '../../config/featureFlags';
import { listBatches } from '../../api/statementsAdmin';
import styles from './adminStatements.module.css';

const STATUS_COLORS = {
  parsing: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  staged: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  distributed: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
  errored: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
};

const FILTER_OPTIONS = ['All', 'Parsing', 'Staged', 'Approved', 'Distributed'];

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// ---------------------------------------------------------------------------
// Mock statements list (flag off) — pre-existing demo behavior, unchanged.
// ---------------------------------------------------------------------------

const MockStatements = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');

  const statements = getAdminStatements();
  const filteredStatements =
    activeFilter === 'All' ? statements : statements.filter((s) => s.status === activeFilter.toLowerCase());

  const handleRowClick = (id) => {
    navigate(`/admin/statements/${id}`);
  };

  return (
    <>
      <div className={styles.filters}>
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            className={`${styles.filterChip} ${activeFilter === filter ? styles.filterChipActive : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Source</th>
              <th>Period</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th>Lines</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredStatements.map((stmt) => {
              const statusStyle = STATUS_COLORS[stmt.status] || STATUS_COLORS.parsing;
              return (
                <tr key={stmt.id} onClick={() => handleRowClick(stmt.id)}>
                  <td className={styles.source}>{stmt.source}</td>
                  <td>{stmt.periodLabel}</td>
                  <td className={styles.date}>{formatDate(stmt.uploadedAt)}</td>
                  <td>
                    <span
                      className={styles.statusPill}
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                    >
                      {stmt.status}
                    </span>
                  </td>
                  <td>{formatNumber(stmt.transactionCount)}</td>
                  <td className={styles.amount}>{formatCurrency(stmt.totalReported)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Live batches list (flag on) — batches auto-derived from uploads (PRD §8).
// ---------------------------------------------------------------------------

const BATCH_STATUS_COLORS = {
  uploaded: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
  parsing: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  parsed: { bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' },
  validating: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
  needs_review: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  distributed: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
  archived: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
};

const BATCH_STATUS_OPTIONS = ['uploaded', 'parsing', 'parsed', 'validating', 'needs_review', 'approved', 'distributed'];

const statusLabel = (status) => (status || '').replace(/_/g, ' ');

// The list endpoint is still landing on the backend — accept both a bare
// array and {batches|items: [...]}, and probe the likely homes of each count.
const extractBatchRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.batches)) return data.batches;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeBatch = (b) => {
  const stats = b.stats || {};
  const validate = stats.validate || {};
  return {
    id: b.id ?? b.batch_id,
    label: b.label || [b.catalog, b.period_code].filter(Boolean).join(' '),
    periodCode: b.period_code || '',
    catalog: b.catalog || '—',
    status: b.status || 'uploaded',
    statementCount: b.statement_count ?? stats.statements ?? stats.statement_count ?? null,
    blockers: b.blockers ?? validate.blockers ?? stats.blockers ?? 0,
    warnings: b.warnings ?? validate.warnings ?? stats.warnings ?? 0,
    uploadedAt: b.uploaded_at || null,
  };
};

const LiveBatches = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [periodOptions, setPeriodOptions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (periodFilter !== 'all') params.period = periodFilter;
    listBatches(params)
      .then((data) => {
        if (cancelled) return;
        setError(null);
        const rows = extractBatchRows(data).map(normalizeBatch);
        setBatches(rows);
        // Keep every period ever seen so the dropdown doesn't collapse
        // to the currently-filtered subset.
        setPeriodOptions((prev) => {
          const merged = new Set(prev);
          rows.forEach((r) => r.periodCode && merged.add(r.periodCode));
          return Array.from(merged).sort();
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setBatches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, periodFilter, refreshKey]);

  const showEmpty = !loading && !error && batches.length === 0;

  return (
    <>
      {error && (
        <div className={styles.errorBanner}>
          <FaExclamationTriangle />
          <div className={styles.errorBannerText}>
            <strong>{error.status === 0 ? 'Backend unreachable' : 'Could not load batches'}</strong>
            <span>{error.message}</span>
          </div>
          <button type="button" className={styles.retryButton} onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.filterSelects}>
        <label className={styles.selectGroup}>
          <span className={styles.selectLabel}>Status</span>
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            {BATCH_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selectGroup}>
          <span className={styles.selectLabel}>Period</span>
          <select className={styles.select} value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
            <option value="all">All</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Period</th>
              <th>Catalog</th>
              <th>Statements</th>
              <th>Status</th>
              <th>Findings</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [0, 1, 2].map((i) => (
                <tr key={`skeleton-${i}`} className={styles.skeletonRow}>
                  {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                    <td key={j}>
                      <span className={styles.skeletonBar} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              batches.map((batch) => {
                const statusStyle = BATCH_STATUS_COLORS[batch.status] || BATCH_STATUS_COLORS.uploaded;
                return (
                  <tr key={batch.id} onClick={() => navigate(`/admin/statements/${batch.id}`)}>
                    <td className={styles.source}>{batch.label}</td>
                    <td>{batch.periodCode || '—'}</td>
                    <td>{batch.catalog}</td>
                    <td>{batch.statementCount == null ? '—' : formatNumber(batch.statementCount)}</td>
                    <td>
                      <span
                        className={styles.statusPill}
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        {statusLabel(batch.status)}
                      </span>
                    </td>
                    <td>
                      {batch.blockers > 0 && (
                        <span className={`${styles.countBadge} ${styles.badgeBlocker}`}>
                          {batch.blockers} blocker{batch.blockers === 1 ? '' : 's'}
                        </span>
                      )}
                      {batch.warnings > 0 && (
                        <span className={`${styles.countBadge} ${styles.badgeWarning}`}>
                          {batch.warnings} warning{batch.warnings === 1 ? '' : 's'}
                        </span>
                      )}
                      {batch.blockers === 0 && batch.warnings === 0 && <span className={styles.date}>—</span>}
                    </td>
                    <td className={styles.date}>{batch.uploadedAt ? formatDate(batch.uploadedAt) : '—'}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {showEmpty && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No batches yet</p>
            <p className={styles.emptyHint}>Upload statements to get started — batches are derived automatically.</p>
          </div>
        )}
      </div>
    </>
  );
};

const AdminStatements = () => {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  if (!isAdmin) {
    return <Navigate to="/earnings" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Statements | Admin | RD</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>{statementsLive ? 'Batches' : 'Statements'}</h1>
              <p className={styles.subtitle}>
                {statementsLive ? 'Statement batches auto-derived from uploads' : 'Manage ingested royalty statements'}
              </p>
            </div>
            <button className={styles.uploadButton} onClick={() => navigate('/admin/statements/upload')}>
              <FaUpload size={14} />
              {statementsLive ? 'Upload Statements' : 'Upload Statement'}
            </button>
          </div>

          {statementsLive ? <LiveBatches /> : <MockStatements />}
        </main>
      </div>
    </>
  );
};

export default AdminStatements;
