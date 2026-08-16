import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useParams, Link } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaFileAlt,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaCheck,
  FaInfoCircle,
  FaSyncAlt,
  FaSearch,
  FaTimes,
  FaPaperPlane,
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { getStatementById, updateStatementStatus } from '../../mocks/statementsAdminData';
import { getTransactionsForClient } from '../../mocks/earningsData';
import { statementsLive } from '../../config/featureFlags';
import {
  getBatch,
  listFindings,
  waiveFinding,
  acknowledgeFinding,
  revalidateBatch,
  listBatchStatements,
  getStatement,
  getStatementLines,
} from '../../api/statementsAdmin';
import { getBatchGate, distributeBatch } from '../../api/distributionAdmin';
import styles from './adminStatementDetail.module.css';

// Validation issue catalog
const BLOCKING_ISSUES = [
  { code: 'B1', message: 'Missing required ISRC for 3 line items' },
  { code: 'B2', message: 'Duplicate transaction IDs detected (rows 45, 78)' },
  { code: 'B3', message: 'Total reported does not match sum of line items' },
  { code: 'B4', message: 'Invalid territory code in 2 transactions' },
  { code: 'B5', message: 'Statement period overlaps with existing approved statement' },
  { code: 'B6', message: 'Currency mismatch: expected USD, found EUR in 5 rows' },
  { code: 'B7', message: 'Missing payee information for unregistered works' },
];

const WARNING_ISSUES = [
  { code: 'W1', message: 'Potential duplicate: similar amounts across 4 line items' },
  { code: 'W2', message: 'Unusually high royalty rate detected (>15%)' },
  { code: 'W3', message: 'Missing catalog match for 2 works - manual review recommended' },
  { code: 'W4', message: 'Period end date is in the future' },
  { code: 'W5', message: 'Source format changed from previous statement' },
];

// Deterministic issue generation based on statement ID
const generateIssuesForStatement = (statementId) => {
  const hash = simpleHash(statementId);
  const issues = [];

  // Determine number of issues (2-4)
  const numIssues = 2 + (hash % 3);

  // Mix of blocking and warnings based on hash
  const hasBlocking = hash % 4 !== 0; // 75% chance of having blocking issues

  if (hasBlocking) {
    // Add 1-2 blocking issues
    const numBlocking = 1 + (hash % 2);
    for (let i = 0; i < numBlocking && issues.length < numIssues; i++) {
      const issueIndex = (hash + i * 7) % BLOCKING_ISSUES.length;
      issues.push({ ...BLOCKING_ISSUES[issueIndex], severity: 'blocking', id: `b-${i}` });
    }
  }

  // Fill remaining with warnings
  let warningIndex = 0;
  while (issues.length < numIssues) {
    const issueIdx = (hash + warningIndex * 11) % WARNING_ISSUES.length;
    issues.push({ ...WARNING_ISSUES[issueIdx], severity: 'warning', id: `w-${warningIndex}` });
    warningIndex++;
  }

  return issues;
};

const STATUS_COLORS = {
  parsing: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  staged: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  distributed: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
  errored: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
};

const MATCH_COLORS = {
  matched: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  ambiguous: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  unmatched: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
};

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Simple hash function for deterministic slicing
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Assign match status deterministically based on index
// ~85% matched, ~10% ambiguous, ~5% unmatched
const assignMatchStatus = (index) => {
  const mod = index % 100;
  if (mod < 85) return 'matched';
  if (mod < 95) return 'ambiguous';
  return 'unmatched';
};

// ---------------------------------------------------------------------------
// Mock statement detail (flag off) — pre-existing demo behavior, unchanged.
// ---------------------------------------------------------------------------

const MockStatementDetail = () => {
  const { id } = useParams();
  const [dismissedWarnings, setDismissedWarnings] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [unmatchedMarkedIntentional, setUnmatchedMarkedIntentional] = useState(false);

  const statement = getStatementById(id);

  // Initialize current status from statement
  const effectiveStatus = currentStatus || statement?.status;

  // Generate validation issues
  const allIssues = useMemo(() => {
    if (!statement) return [];
    return generateIssuesForStatement(id);
  }, [id, statement]);

  // Filter out dismissed warnings
  const visibleIssues = useMemo(() => {
    return allIssues.filter((issue) => !dismissedWarnings.includes(issue.id));
  }, [allIssues, dismissedWarnings]);

  const blockingCount = visibleIssues.filter((i) => i.severity === 'blocking').length;
  const warningCount = visibleIssues.filter((i) => i.severity === 'warning').length;

  const handleOverride = (issueId) => {
    setDismissedWarnings((prev) => [...prev, issueId]);
  };

  const handleApprove = () => {
    updateStatementStatus(id, 'approved');
    setCurrentStatus('approved');
  };

  const handleMarkUnmatchedIntentional = () => {
    setUnmatchedMarkedIntentional(true);
  };

  // Generate line items based on statement id
  const lineItems = useMemo(() => {
    if (!statement) return [];

    // Get all transactions and slice based on statement id hash
    const allTransactions = getTransactionsForClient(null);
    const hash = simpleHash(id);
    const startIndex = hash % Math.max(1, allTransactions.length - 80);
    const sliced = allTransactions.slice(startIndex, startIndex + 80);

    // Add match_status to each line item
    return sliced.map((tx, i) => ({
      ...tx,
      match_status: assignMatchStatus(i + hash),
    }));
  }, [id, statement]);

  // Count match statuses
  const matchCounts = useMemo(() => {
    const counts = { matched: 0, ambiguous: 0, unmatched: 0 };
    lineItems.forEach((item) => {
      counts[item.match_status]++;
    });
    // If unmatched marked as intentional, move them to matched
    if (unmatchedMarkedIntentional) {
      counts.matched += counts.unmatched;
      counts.unmatched = 0;
    }
    return counts;
  }, [lineItems, unmatchedMarkedIntentional]);

  if (!statement) {
    return (
      <>
        <Helmet>
          <title>Statement Not Found | Admin | RD</title>
        </Helmet>
        <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
          <Sidebar />
          <main className={styles.shell}>
            <Link to="/admin/statements" className={styles.backLink}>
              <FaArrowLeft size={12} />
              Back to Statements
            </Link>
            <div className={styles.notFound}>
              <h1 className={styles.notFoundTitle}>Statement Not Found</h1>
              <p className={styles.notFoundText}>The statement you are looking for does not exist.</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  const statusStyle = STATUS_COLORS[effectiveStatus] || STATUS_COLORS.parsing;
  const canApprove = effectiveStatus === 'staged' && blockingCount === 0;
  const isApproved = effectiveStatus === 'approved' || effectiveStatus === 'distributed';

  return (
    <>
      <Helmet>
        <title>
          {statement.source} {statement.periodLabel} | Admin | RD
        </title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <Link to="/admin/statements" className={styles.backLink}>
            <FaArrowLeft size={12} />
            Back to Statements
          </Link>

          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{statement.source}</h1>
                <span
                  className={styles.statusPill}
                  style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                >
                  {effectiveStatus}
                </span>
              </div>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <FaCalendarAlt size={12} />
                  {statement.periodLabel}
                </span>
                <span className={styles.metaItem}>
                  <FaFileAlt size={12} />
                  Uploaded {formatDate(statement.uploadedAt)}
                </span>
                <span className={styles.metaItem}>Total: {formatCurrency(statement.totalReported)}</span>
              </div>
            </div>
            <div className={styles.headerRight}>
              {isApproved ? (
                <button className={styles.approveButton} disabled>
                  <FaCheck size={12} />
                  Approved
                </button>
              ) : (
                <button
                  className={styles.approveButton}
                  onClick={handleApprove}
                  disabled={!canApprove}
                  title={blockingCount > 0 ? 'Resolve blocking issues first' : ''}
                >
                  Approve & Stage Distribution
                </button>
              )}
            </div>
          </div>

          <div className={styles.summaryBar}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryDot} style={{ backgroundColor: '#10b981' }} />
              <span className={styles.summaryCount}>{matchCounts.matched}</span>
              <span className={styles.summaryLabel}>matched</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryDot} style={{ backgroundColor: '#f59e0b' }} />
              <span className={styles.summaryCount}>{matchCounts.ambiguous}</span>
              <span className={styles.summaryLabel}>ambiguous</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryDot} style={{ backgroundColor: '#ef4444' }} />
              <span className={styles.summaryCount}>{matchCounts.unmatched}</span>
              <span className={styles.summaryLabel}>unmatched</span>
            </div>
          </div>

          {visibleIssues.length > 0 && (
            <div className={styles.validationPanel}>
              <div
                className={styles.validationHeader}
                style={{
                  backgroundColor:
                    blockingCount > 0
                      ? 'rgba(239, 68, 68, 0.1)'
                      : warningCount > 0
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(16, 185, 129, 0.1)',
                  color: blockingCount > 0 ? '#ef4444' : warningCount > 0 ? '#f59e0b' : '#10b981',
                }}
              >
                <span>Validation</span>
                <div className={styles.validationCounts}>
                  {blockingCount > 0 && (
                    <span className={styles.validationCount}>
                      <FaExclamationCircle size={14} />
                      {blockingCount} blocking
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className={styles.validationCount} style={{ color: '#f59e0b' }}>
                      <FaExclamationTriangle size={14} />
                      {warningCount} warnings
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.validationList}>
                {visibleIssues.map((issue) => (
                  <div key={issue.id} className={styles.validationRow}>
                    <div
                      className={styles.validationIcon}
                      style={{
                        backgroundColor:
                          issue.severity === 'blocking' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: issue.severity === 'blocking' ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {issue.severity === 'blocking' ? (
                        <FaExclamationCircle size={12} />
                      ) : (
                        <FaExclamationTriangle size={12} />
                      )}
                    </div>
                    <span className={styles.validationCode}>{issue.code}</span>
                    <span className={styles.validationMessage}>{issue.message}</span>
                    {issue.severity === 'warning' && (
                      <button className={styles.overrideButton} onClick={() => handleOverride(issue.id)}>
                        Override
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Work</th>
                  <th>Source/Platform</th>
                  <th>Territory</th>
                  <th>Income Type</th>
                  <th>Amount</th>
                  <th>Match Status</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => {
                  const matchStyle = MATCH_COLORS[item.match_status] || MATCH_COLORS.matched;
                  return (
                    <tr key={item.id}>
                      <td className={styles.date}>{item.date}</td>
                      <td className={styles.workTitle}>{item.title}</td>
                      <td>{item.platform || item.source}</td>
                      <td>{item.territoryName || item.territory}</td>
                      <td>{item.incomeName || item.category}</td>
                      <td className={styles.amount}>{formatCurrency(item.amount)}</td>
                      <td>
                        <span
                          className={styles.matchPill}
                          style={{ backgroundColor: matchStyle.bg, color: matchStyle.color }}
                        >
                          {item.match_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {matchCounts.unmatched > 0 && !unmatchedMarkedIntentional && (
            <div className={styles.unmatchedActions}>
              <button className={styles.markIntentionalButton} onClick={handleMarkUnmatchedIntentional}>
                Mark {matchCounts.unmatched} unmatched as intentional
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Live batch detail (flag on) — API-driven validation findings (PRD §7-8).
// ---------------------------------------------------------------------------

const BATCH_STATUS_COLORS = {
  uploaded: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
  parsing: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  parsed: { bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' },
  validating: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
  needs_review: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  distributed: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
};

const SEVERITY_STYLES = {
  blocker: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  info: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
};

const SEVERITY_ICONS = {
  blocker: FaExclamationCircle,
  warning: FaExclamationTriangle,
  info: FaInfoCircle,
};

// Rule level groups derived from the rule_id prefix (PRD §7.2 catalog).
const RULE_GROUPS = [
  { prefix: 'V-FILE', label: 'File integrity' },
  { prefix: 'V-STMT', label: 'Statement math' },
  { prefix: 'V-LEDG', label: 'Ledger continuity' },
  { prefix: 'V-BATCH', label: 'Batch completeness' },
];

const groupLabelFor = (ruleId) => {
  const match = RULE_GROUPS.find((g) => (ruleId || '').startsWith(g.prefix));
  return match ? match.label : 'Other';
};

const GROUP_ORDER = [...RULE_GROUPS.map((g) => g.label), 'Other'];

const statusLabel = (status) => (status || '').replace(/_/g, ' ');

// Findings endpoint is still landing on the backend — accept a bare array
// or {findings|items: [...]} and probe the likely field homes.
const extractFindingRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.findings)) return data.findings;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeFinding = (f) => ({
  id: f.id ?? f.finding_id,
  ruleId: f.rule_id || '—',
  severity: f.severity || 'info',
  scope: f.scope || null,
  scopeRef: f.scope_ref || null,
  message: f.message || '',
  status: f.status || 'open',
  waivedBy: f.waived_by_email ?? f.waived_by ?? null,
  waivedReason: f.waived_reason || null,
  waivedAt: f.waived_at || null,
  // Acknowledging is metadata-only on the backend: status stays 'open',
  // only acknowledged_at/by are stamped (PRD §5).
  acknowledgedAt: f.acknowledged_at || null,
  details: f.details || null,
});

const normalizeBatchDetail = (b) => {
  const stats = b.stats || {};
  return {
    id: b.id ?? b.batch_id,
    label: b.label || [b.catalog, b.period_code].filter(Boolean).join(' ') || `Batch ${b.id ?? b.batch_id}`,
    periodCode: b.period_code || '',
    catalog: b.catalog || '—',
    status: b.status || 'uploaded',
    statementCount: b.statement_count ?? stats.statements ?? stats.statement_count ?? null,
    uploadedAt: b.uploaded_at || null,
  };
};

// --- Statements table + drill-down (FE-005) -------------------------------

// Zero payable is NORMAL (PRD §2.6) — explain it, never alarm.
const ZERO_PAY_STYLES = {
  paid: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  threshold_carryover: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  recouped: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
  zero_earnings: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
};

const PARSE_STATUS_COLORS = {
  parsed: '#10b981',
  pending: '#f59e0b',
  failed: '#ef4444',
};

// Backend Numerics arrive as strings; absent fields stay null (never 0).
const toNumber = (value) => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const extractStatementRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.statements)) return data.statements;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeStatementRow = (s) => ({
  id: s.id ?? s.statement_id,
  accountCode: s.account_code || s.account?.account_code || '—',
  writerName: s.writer_name || s.writer?.canonical_name || s.account?.writer?.canonical_name || '—',
  calculated: toNumber(s.calculated),
  payable: toNumber(s.payable),
  detailSum: toNumber(s.detail_sum),
  zeroPayReason: s.zero_pay_reason || null,
  parseStatus: s.parse_status || 'pending',
  lineCount: s.line_count ?? null,
});

const normalizeStatementDetail = (s) => ({
  ...normalizeStatementRow(s),
  periodCode: s.period_code || '',
  recouped: toNumber(s.recouped),
  reserveTaken: toNumber(s.reserve_taken),
  reserveReleased: toNumber(s.reserve_released),
  carriedForwardIn: toNumber(s.carried_forward_in),
  payablePrev: toNumber(s.payable_prev),
  settlementPaid: toNumber(s.settlement_paid),
  carriedForwardOut: toNumber(s.carried_forward_out),
  chequeAmount: toNumber(s.cheque_amount),
  parseError: s.parse_error || null,
});

// XLSX sum matches the PDF figure to the cent for 2,609/2,611 real
// statements (PRD §2.5) — beyond a cent deserves eyes.
const detailMatchState = (row) => {
  if (row.detailSum == null || row.calculated == null) return 'unknown';
  return Math.abs(row.detailSum - row.calculated) <= 0.01 ? 'match' : 'mismatch';
};

// PDF account-summary waterfall (PRD §2.5): payable = calculated − recouped
// − reserve_taken + reserve_released + carried_forward + payable_prev
// − settlement_paid. Null component == absent on the statement, skip the row.
const WATERFALL_COMPONENTS = [
  { key: 'calculated', label: 'Royalties calculated', sign: 1 },
  { key: 'recouped', label: 'Recouped against advance', sign: -1 },
  { key: 'reserveTaken', label: 'Reserve taken', sign: -1 },
  { key: 'reserveReleased', label: 'Reserve released', sign: 1 },
  { key: 'carriedForwardIn', label: 'Carried forward from previous period', sign: 1 },
  { key: 'payablePrev', label: 'Previous payable not yet settled', sign: 1 },
  { key: 'settlementPaid', label: 'Settlement paid', sign: -1 },
];

const extractLinesPage = (data) => {
  if (Array.isArray(data)) return { rows: data, total: null };
  return {
    rows: data?.lines || data?.items || [],
    total: data?.total ?? data?.total_count ?? data?.count ?? null,
  };
};

const normalizeLine = (line, index) => ({
  id: line.id ?? `row-${index}`,
  asset: line.song_code || line.asset_id || line.custom_id || '—',
  title: line.song_title || '—',
  country: line.country || '—',
  source: line.income_source || line.channel || '—',
  type: line.income_type || '—',
  units: toNumber(line.units),
  earnings: toNumber(line.earnings),
});

const formatUnits = (units) => (units == null ? '—' : new Intl.NumberFormat('en-US').format(units));

const signedCurrency = (amount, sign) => {
  const value = amount * sign;
  return value < 0 ? `− ${formatCurrency(Math.abs(value))}` : formatCurrency(value);
};

const LINES_PAGE_SIZE = 50;

const StatementDrilldown = ({ statementId, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [lines, setLines] = useState([]);
  const [linesTotal, setLinesTotal] = useState(null);
  const [linesError, setLinesError] = useState(null);
  const [linesLoading, setLinesLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    getStatement(statementId)
      .then((data) => {
        if (cancelled) return;
        setDetail(normalizeStatementDetail(data || {}));
        setDetailError(null);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statementId, retryKey]);

  useEffect(() => {
    let cancelled = false;
    setLinesLoading(true);
    getStatementLines(statementId, page, LINES_PAGE_SIZE)
      .then((data) => {
        if (cancelled) return;
        const { rows, total } = extractLinesPage(data);
        setLines(rows.map(normalizeLine));
        setLinesTotal(total);
        setLinesError(null);
      })
      .catch((err) => {
        if (!cancelled) setLinesError(err);
      })
      .finally(() => {
        if (!cancelled) setLinesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statementId, page, retryKey]);

  const totalPages = linesTotal == null ? null : Math.max(1, Math.ceil(linesTotal / LINES_PAGE_SIZE));
  // Without a server total, assume more pages while pages come back full.
  const hasNext = totalPages == null ? lines.length === LINES_PAGE_SIZE : page < totalPages;
  const waterfallRows = detail ? WATERFALL_COMPONENTS.filter(({ key }) => detail[key] != null) : [];
  const zeroPayStyle = detail?.zeroPayReason ? ZERO_PAY_STYLES[detail.zeroPayReason] : null;

  return (
    <div className={styles.slideOverOverlay} onClick={onClose}>
      <aside className={styles.slideOver} onClick={(e) => e.stopPropagation()}>
        <div className={styles.slideOverHeader}>
          <div>
            <h2 className={styles.slideOverTitle}>
              {detail ? `${detail.accountCode} · ${detail.writerName}` : 'Statement'}
            </h2>
            {detail?.periodCode && <span className={styles.slideOverSub}>{detail.periodCode}</span>}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <FaTimes size={14} />
          </button>
        </div>

        {detailError && (
          <div className={styles.errorBanner}>
            <FaExclamationTriangle />
            <div className={styles.errorBannerText}>
              <strong>{detailError.status === 0 ? 'Backend unreachable' : 'Could not load statement'}</strong>
              <span>{detailError.message}</span>
            </div>
            <button type="button" className={styles.retryButton} onClick={() => setRetryKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        )}

        {detailLoading ? (
          <div className={styles.skeletonBlock}>
            <span className={styles.skeletonBar} style={{ width: '50%' }} />
            <span className={styles.skeletonBar} style={{ width: '70%' }} />
            <span className={styles.skeletonBar} style={{ width: '60%' }} />
          </div>
        ) : (
          detail && (
            <>
              <h3 className={styles.slideOverSection}>Account summary</h3>
              <div className={styles.waterfall}>
                {waterfallRows.map(({ key, label, sign }) => (
                  <div key={key} className={styles.waterfallRow}>
                    <span className={styles.waterfallLabel}>{label}</span>
                    <span className={styles.waterfallAmount}>{signedCurrency(detail[key], sign)}</span>
                  </div>
                ))}
                <div className={`${styles.waterfallRow} ${styles.waterfallTotal}`}>
                  <span className={styles.waterfallLabel}>Payable</span>
                  <span className={styles.waterfallAmount}>
                    {detail.payable == null ? '—' : formatCurrency(detail.payable)}
                  </span>
                </div>
                {zeroPayStyle && (
                  <div className={styles.waterfallRow}>
                    <span className={styles.waterfallLabel}>Zero-pay reason</span>
                    <span
                      className={styles.zeroPayBadge}
                      style={{ backgroundColor: zeroPayStyle.bg, color: zeroPayStyle.color }}
                    >
                      {statusLabel(detail.zeroPayReason)}
                    </span>
                  </div>
                )}
                {detail.carriedForwardOut != null && (
                  <div className={styles.waterfallRow}>
                    <span className={styles.waterfallLabel}>Carried forward to next period</span>
                    <span className={styles.waterfallAmount}>{formatCurrency(detail.carriedForwardOut)}</span>
                  </div>
                )}
                {detail.chequeAmount != null && (
                  <div className={styles.waterfallRow}>
                    <span className={styles.waterfallLabel}>Cheque amount (letter)</span>
                    <span className={styles.waterfallAmount}>{formatCurrency(detail.chequeAmount)}</span>
                  </div>
                )}
                {detail.detailSum != null && (
                  <div className={styles.waterfallRow}>
                    <span className={styles.waterfallLabel}>
                      XLSX detail sum{detail.lineCount != null ? ` (${detail.lineCount} lines)` : ''}
                    </span>
                    <span className={styles.waterfallAmount}>
                      {formatCurrency(detail.detailSum)}{' '}
                      {detailMatchState(detail) === 'match' ? (
                        <span className={styles.matchOk}>✓ matches calculated</span>
                      ) : detailMatchState(detail) === 'mismatch' ? (
                        <span className={styles.matchBad}>
                          Δ {formatCurrency(Math.abs(detail.detailSum - detail.calculated))}
                        </span>
                      ) : null}
                    </span>
                  </div>
                )}
              </div>
              {detail.parseError && <p className={styles.modalError}>Parse error: {detail.parseError}</p>}
            </>
          )
        )}

        <h3 className={styles.slideOverSection}>Line items</h3>

        {linesError && (
          <div className={styles.errorBanner}>
            <FaExclamationTriangle />
            <div className={styles.errorBannerText}>
              <strong>{linesError.status === 0 ? 'Backend unreachable' : 'Could not load line items'}</strong>
              <span>{linesError.message}</span>
            </div>
            <button type="button" className={styles.retryButton} onClick={() => setRetryKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        )}

        {linesLoading ? (
          <div className={styles.skeletonBlock}>
            <span className={styles.skeletonBar} style={{ width: '90%' }} />
            <span className={styles.skeletonBar} style={{ width: '85%' }} />
            <span className={styles.skeletonBar} style={{ width: '88%' }} />
          </div>
        ) : !linesError && lines.length === 0 ? (
          <p className={styles.sectionNote}>No line items{page > 1 ? ' on this page' : ' for this statement'}.</p>
        ) : (
          !linesError && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Song / Asset</th>
                    <th>Title</th>
                    <th>Country</th>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Units</th>
                    <th>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className={styles.scopeRef}>{line.asset}</td>
                      <td className={styles.workTitle}>{line.title}</td>
                      <td>{line.country}</td>
                      <td>{line.source}</td>
                      <td>{line.type}</td>
                      <td className={styles.amount}>{formatUnits(line.units)}</td>
                      <td className={styles.amount}>{line.earnings == null ? '—' : formatCurrency(line.earnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={page <= 1 || linesLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page}
            {totalPages != null ? ` of ${totalPages}` : ''}
            {linesTotal != null ? ` · ${new Intl.NumberFormat('en-US').format(linesTotal)} lines` : ''}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            disabled={!hasNext || linesLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </aside>
    </div>
  );
};

const StatementRow = ({ row, onOpen }) => {
  const matchState = detailMatchState(row);
  const zeroPayStyle = row.zeroPayReason ? ZERO_PAY_STYLES[row.zeroPayReason] || ZERO_PAY_STYLES.zero_earnings : null;
  return (
    <tr className={styles.clickableRow} onClick={() => onOpen(row)}>
      <td className={styles.scopeRef}>{row.accountCode}</td>
      <td className={styles.workTitle}>{row.writerName}</td>
      <td className={styles.amount}>{row.calculated == null ? '—' : formatCurrency(row.calculated)}</td>
      <td className={styles.amount}>{row.payable == null ? '—' : formatCurrency(row.payable)}</td>
      <td>
        {zeroPayStyle ? (
          <span className={styles.zeroPayBadge} style={{ backgroundColor: zeroPayStyle.bg, color: zeroPayStyle.color }}>
            {statusLabel(row.zeroPayReason)}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td>
        {matchState === 'match' ? (
          <span className={styles.matchOk}>✓ match</span>
        ) : matchState === 'mismatch' ? (
          <span className={styles.matchBad}>Δ {formatCurrency(Math.abs(row.detailSum - row.calculated))}</span>
        ) : (
          <span className={styles.matchUnknown}>—</span>
        )}
      </td>
      <td>
        <span style={{ color: PARSE_STATUS_COLORS[row.parseStatus] || 'var(--soft-text)' }}>
          {statusLabel(row.parseStatus)}
        </span>
      </td>
    </tr>
  );
};

const isActionable = (finding) =>
  finding.status === 'open' && (finding.severity === 'blocker' || finding.severity === 'warning');

const isSettled = (finding) => finding.status !== 'open';

const WaiveModal = ({ finding, busy, error, onSubmit, onClose }) => {
  const [reason, setReason] = useState('');
  const canSubmit = reason.trim().length > 0 && !busy;

  return (
    <div className={styles.modalOverlay} onClick={busy ? undefined : onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Waive finding</h2>
        <p className={styles.modalFinding}>
          <span className={styles.validationCode}>{finding.ruleId}</span> {finding.message}
        </p>
        <label className={styles.modalLabel} htmlFor="waive-reason">
          Reason (required — logged with your user and surfaced in the distribution record)
        </label>
        <textarea
          id="waive-reason"
          className={styles.modalTextarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is it safe to ignore this finding?"
          rows={3}
          autoFocus
        />
        {error && <p className={styles.modalError}>{error.message}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.markIntentionalButton} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.approveButton}
            disabled={!canSubmit}
            onClick={() => onSubmit(reason.trim())}
          >
            {busy ? 'Waiving…' : 'Waive finding'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FindingRow = ({ finding, busy, onWaive, onAcknowledge }) => {
  const [expanded, setExpanded] = useState(false);
  const settled = isSettled(finding);
  const severityStyle = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.info;
  const Icon = SEVERITY_ICONS[finding.severity] || FaInfoCircle;
  const hasExpandable = settled && (finding.waivedReason || finding.waivedBy);

  return (
    <div className={`${styles.validationRow} ${styles.findingRow} ${settled ? styles.findingSettled : ''}`}>
      <div className={styles.findingMain}>
        <div
          className={styles.validationIcon}
          style={{ backgroundColor: severityStyle.bg, color: severityStyle.color }}
        >
          <Icon size={12} />
        </div>
        <span
          className={styles.severityBadge}
          style={{ backgroundColor: severityStyle.bg, color: severityStyle.color }}
        >
          {finding.severity}
        </span>
        <span className={styles.validationCode}>{finding.ruleId}</span>
        <span className={`${styles.validationMessage} ${settled ? styles.findingStruck : ''}`}>{finding.message}</span>
        {finding.scopeRef && <span className={styles.scopeRef}>{finding.scopeRef}</span>}
        <span className={styles.findingStatus}>{statusLabel(finding.status)}</span>
        {isActionable(finding) && (
          <span className={styles.findingActions}>
            {finding.severity === 'warning' &&
              (finding.acknowledgedAt ? (
                <span className={styles.findingStatus}>Acknowledged ✓</span>
              ) : (
                <button
                  type="button"
                  className={styles.overrideButton}
                  disabled={busy}
                  onClick={() => onAcknowledge(finding)}
                >
                  Acknowledge
                </button>
              ))}
            <button type="button" className={styles.overrideButton} disabled={busy} onClick={() => onWaive(finding)}>
              Waive
            </button>
          </span>
        )}
        {hasExpandable && (
          <button type="button" className={styles.expandButton} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide' : 'Details'}
          </button>
        )}
      </div>
      {expanded && hasExpandable && (
        <div className={styles.findingWaiveDetails}>
          {finding.waivedBy != null && <span>Waived by: {finding.waivedBy}</span>}
          {finding.waivedAt && <span>On: {formatDate(finding.waivedAt)}</span>}
          {finding.waivedReason && <span>Reason: {finding.waivedReason}</span>}
        </div>
      )}
    </div>
  );
};

const LiveBatchDetail = () => {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [revalidating, setRevalidating] = useState(false);
  const [statements, setStatements] = useState([]);
  const [statementsUnavailable, setStatementsUnavailable] = useState(false);
  const [statementSearch, setStatementSearch] = useState('');
  const [drilldownId, setDrilldownId] = useState(null);
  const [gate, setGate] = useState(null);
  const [distributing, setDistributing] = useState(false);
  const [distributeResult, setDistributeResult] = useState(null);
  const pollCountRef = useRef(0);

  const load = useCallback(async () => {
    const [batchResult, findingsResult, statementsResult, gateResult] = await Promise.allSettled([
      getBatch(id),
      listFindings(id),
      listBatchStatements(id),
      getBatchGate(id),
    ]);
    if (batchResult.status === 'fulfilled') {
      setBatch(normalizeBatchDetail(batchResult.value || {}));
    }
    if (gateResult.status === 'fulfilled') {
      setGate(gateResult.value || null);
    } else if (gateResult.reason?.status === 404) {
      setGate(null);
    }
    if (findingsResult.status === 'fulfilled') {
      setFindings(extractFindingRows(findingsResult.value).map(normalizeFinding));
    }
    if (statementsResult.status === 'fulfilled') {
      setStatements(extractStatementRows(statementsResult.value).map(normalizeStatementRow));
      setStatementsUnavailable(false);
    } else if (statementsResult.reason?.status === 404) {
      // Endpoint not landed on the backend yet — degrade to a note.
      setStatementsUnavailable(true);
    }
    if (batchResult.status === 'rejected') {
      if (batchResult.reason?.status === 404) {
        setNotFound(true);
        return;
      }
      throw batchResult.reason;
    }
    if (findingsResult.status === 'rejected' && findingsResult.reason?.status !== 404) {
      throw findingsResult.reason;
    }
    if (statementsResult.status === 'rejected' && statementsResult.reason?.status !== 404) {
      throw statementsResult.reason;
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    load()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  // After Revalidate: re-poll batch + findings every 2s until the batch
  // leaves the validating stage (or we give up after 60s).
  useEffect(() => {
    if (!revalidating) return undefined;
    pollCountRef.current = 0;
    const timer = setInterval(() => {
      pollCountRef.current += 1;
      const polls = pollCountRef.current;
      load()
        .then(() => {
          setError(null);
          setBatch((current) => {
            if (polls >= 2 && current && current.status !== 'validating') setRevalidating(false);
            return current;
          });
        })
        .catch((err) => {
          setError(err);
          setRevalidating(false);
        });
      if (polls >= 30) setRevalidating(false);
    }, 2000);
    return () => clearInterval(timer);
  }, [revalidating, load]);

  const handleRevalidate = async () => {
    setActionError(null);
    try {
      await revalidateBatch(id);
      setRevalidating(true);
    } catch (err) {
      setActionError(err);
    }
  };

  const handleDistribute = async () => {
    setActionError(null);
    setDistributeResult(null);
    setDistributing(true);
    try {
      const result = await distributeBatch(id);
      setDistributeResult(result);
      setRefreshKey((k) => k + 1); // refresh batch status + gate
    } catch (err) {
      // 409 → gate not green; the backend returns the gate state so we can
      // show exactly what's blocking.
      if (err?.status === 409 && err?.detail?.detail?.gate) {
        setGate(err.detail.detail.gate);
        setActionError({ message: 'Gate not ready — resolve the items below before distributing.' });
      } else {
        setActionError(err);
      }
    } finally {
      setDistributing(false);
    }
  };

  const handleWaiveSubmit = async (reason) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await waiveFinding(waiveTarget.id, reason);
      setWaiveTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err);
    } finally {
      setActionBusy(false);
    }
  };

  const handleAcknowledge = async (finding) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await acknowledgeFinding(finding.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err);
    } finally {
      setActionBusy(false);
    }
  };

  const severityCounts = useMemo(() => {
    const counts = { blocker: 0, warning: 0, info: 0 };
    findings.forEach((f) => {
      if (f.status === 'open' && counts[f.severity] != null) counts[f.severity] += 1;
    });
    return counts;
  }, [findings]);

  const groupedFindings = useMemo(() => {
    const groups = new Map();
    findings.forEach((f) => {
      const label = groupLabelFor(f.ruleId);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(f);
    });
    // Open findings first within each group, blockers before warnings.
    const severityRank = { blocker: 0, warning: 1, info: 2 };
    groups.forEach((list) =>
      list.sort(
        (a, b) =>
          (isSettled(a) ? 1 : 0) - (isSettled(b) ? 1 : 0) ||
          (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3)
      )
    );
    return GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({
      label,
      findings: groups.get(label),
    }));
  }, [findings]);

  const filteredStatements = useMemo(() => {
    const query = statementSearch.trim().toLowerCase();
    if (!query) return statements;
    return statements.filter(
      (s) => s.accountCode.toLowerCase().includes(query) || s.writerName.toLowerCase().includes(query)
    );
  }, [statements, statementSearch]);

  const statusStyle = BATCH_STATUS_COLORS[batch?.status] || BATCH_STATUS_COLORS.uploaded;

  if (notFound) {
    return (
      <>
        <Helmet>
          <title>Batch Not Found | Admin | RD</title>
        </Helmet>
        <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
          <Sidebar />
          <main className={styles.shell}>
            <Link to="/admin/statements" className={styles.backLink}>
              <FaArrowLeft size={12} />
              Back to Batches
            </Link>
            <div className={styles.notFound}>
              <h1 className={styles.notFoundTitle}>Batch Not Found</h1>
              <p className={styles.notFoundText}>The batch you are looking for does not exist.</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{batch ? `${batch.label} | Admin | RD` : 'Batch | Admin | RD'}</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <Link to="/admin/statements" className={styles.backLink}>
            <FaArrowLeft size={12} />
            Back to Batches
          </Link>

          {error && (
            <div className={styles.errorBanner}>
              <FaExclamationTriangle />
              <div className={styles.errorBannerText}>
                <strong>{error.status === 0 ? 'Backend unreachable' : 'Could not load batch'}</strong>
                <span>{error.message}</span>
              </div>
              <button type="button" className={styles.retryButton} onClick={() => setRefreshKey((k) => k + 1)}>
                Retry
              </button>
            </div>
          )}

          {actionError && (
            <div className={styles.errorBanner}>
              <FaExclamationTriangle />
              <div className={styles.errorBannerText}>
                <strong>{actionError.status === 0 ? 'Backend unreachable' : 'Action failed'}</strong>
                <span>{actionError.message}</span>
              </div>
              <button type="button" className={styles.retryButton} onClick={() => setActionError(null)}>
                Dismiss
              </button>
            </div>
          )}

          {loading && !batch ? (
            <div className={styles.skeletonBlock}>
              <span className={styles.skeletonBar} style={{ width: '40%' }} />
              <span className={styles.skeletonBar} style={{ width: '65%' }} />
              <span className={styles.skeletonBar} style={{ width: '55%' }} />
            </div>
          ) : (
            <>
              <div className={styles.header}>
                <div className={styles.headerLeft}>
                  <div className={styles.titleRow}>
                    <h1 className={styles.title}>{batch ? batch.label : `Batch ${id}`}</h1>
                    {batch && (
                      <span
                        className={styles.statusPill}
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        {statusLabel(batch.status)}
                      </span>
                    )}
                  </div>
                  <div className={styles.meta}>
                    {batch?.periodCode && (
                      <span className={styles.metaItem}>
                        <FaCalendarAlt size={12} />
                        {batch.periodCode}
                      </span>
                    )}
                    <span className={styles.metaItem}>
                      <FaFileAlt size={12} />
                      {batch?.statementCount == null ? '— statements' : `${batch.statementCount} statements`}
                    </span>
                    {batch?.uploadedAt && (
                      <span className={styles.metaItem}>Uploaded {formatDate(batch.uploadedAt)}</span>
                    )}
                  </div>
                </div>
                <div className={styles.headerRight}>
                  {gate && (
                    <span
                      title={gate.ready ? 'Ready to distribute' : (gate.reasons || []).join(' · ')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: gate.ready ? '#22c55e' : '#f59e0b',
                        background: gate.ready ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      }}
                    >
                      {gate.ready ? <FaCheck size={10} /> : <FaExclamationTriangle size={10} />}
                      {gate.ready ? 'Gate ready' : `Gate: ${(gate.reasons || []).length} blocking`}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.revalidateButton}
                    onClick={handleRevalidate}
                    disabled={revalidating}
                  >
                    <FaSyncAlt size={12} className={revalidating ? styles.spinning : undefined} />
                    {revalidating ? 'Revalidating…' : 'Revalidate'}
                  </button>
                  <button
                    type="button"
                    className={styles.revalidateButton}
                    onClick={handleDistribute}
                    disabled={distributing || batch?.status === 'distributed' || (gate && !gate.ready)}
                    title={
                      batch?.status === 'distributed'
                        ? 'Already distributed'
                        : gate && !gate.ready
                          ? (gate.reasons || []).join(' · ')
                          : 'Publish this batch to writer portals'
                    }
                  >
                    <FaPaperPlane size={12} />
                    {distributing ? 'Distributing…' : batch?.status === 'distributed' ? 'Distributed' : 'Distribute'}
                  </button>
                </div>
              </div>

              <div className={styles.summaryBar}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryDot} style={{ backgroundColor: '#ef4444' }} />
                  <span className={styles.summaryCount}>{severityCounts.blocker}</span>
                  <span className={styles.summaryLabel}>open blockers</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryDot} style={{ backgroundColor: '#f59e0b' }} />
                  <span className={styles.summaryCount}>{severityCounts.warning}</span>
                  <span className={styles.summaryLabel}>open warnings</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryDot} style={{ backgroundColor: '#6b7280' }} />
                  <span className={styles.summaryCount}>{severityCounts.info}</span>
                  <span className={styles.summaryLabel}>info</span>
                </div>
              </div>

              {gate && !gate.ready && (
                <div className={styles.validationPanel} style={{ borderLeft: '3px solid #f59e0b' }}>
                  <div className={styles.groupHeader}>
                    <span>
                      <FaExclamationTriangle size={12} /> Readiness gate — not ready to distribute
                    </span>
                    <span className={styles.groupCount}>
                      {gate.counts?.distributable ?? 0}/{gate.counts?.total ?? 0} distributable
                    </span>
                  </div>
                  <ul style={{ margin: 0, padding: '10px 16px 12px 30px', lineHeight: 1.6 }}>
                    {(gate.reasons || []).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {distributeResult && (
                <div className={styles.validationPanel} style={{ borderLeft: '3px solid #22c55e' }}>
                  <div className={styles.emptyFindings}>
                    <FaCheck size={14} />
                    <span>
                      Distributed to portals — {distributeResult.published} published
                      {distributeResult.superseded ? `, ${distributeResult.superseded} superseded` : ''}
                      {distributeResult.skipped_cadence_dedup
                        ? `, ${distributeResult.skipped_cadence_dedup} de-duped`
                        : ''}
                      .
                    </span>
                  </div>
                </div>
              )}

              {!loading && !error && findings.length === 0 && (
                <div className={styles.validationPanel}>
                  <div className={styles.emptyFindings}>
                    <FaCheck size={14} />
                    <span>No validation findings for this batch.</span>
                  </div>
                </div>
              )}

              {groupedFindings.map((group) => (
                <div key={group.label} className={styles.validationPanel}>
                  <div className={styles.groupHeader}>
                    <span>{group.label}</span>
                    <span className={styles.groupCount}>
                      {group.findings.length} finding{group.findings.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className={styles.validationList}>
                    {group.findings.map((finding) => (
                      <FindingRow
                        key={finding.id ?? `${finding.ruleId}-${finding.scopeRef}`}
                        finding={finding}
                        busy={actionBusy}
                        onWaive={setWaiveTarget}
                        onAcknowledge={handleAcknowledge}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className={styles.statementsHeader}>
                <h2 className={styles.statementsTitle}>Statements</h2>
                <div className={styles.searchBox}>
                  <FaSearch size={12} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Filter by account code or writer…"
                    value={statementSearch}
                    onChange={(e) => setStatementSearch(e.target.value)}
                  />
                </div>
              </div>

              {statementsUnavailable ? (
                <p className={styles.sectionNote}>
                  Statement list isn&apos;t available from the backend yet for this batch.
                </p>
              ) : statements.length === 0 ? (
                <p className={styles.sectionNote}>No statements in this batch.</p>
              ) : filteredStatements.length === 0 ? (
                <p className={styles.sectionNote}>No statements match “{statementSearch.trim()}”.</p>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Writer</th>
                        <th>Calculated</th>
                        <th>Payable</th>
                        <th>Zero-Pay Reason</th>
                        <th>Detail vs Calculated</th>
                        <th>Parse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStatements.map((row) => (
                        <StatementRow key={row.id} row={row} onOpen={(r) => setDrilldownId(r.id)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {drilldownId != null && <StatementDrilldown statementId={drilldownId} onClose={() => setDrilldownId(null)} />}

          {waiveTarget && (
            <WaiveModal
              finding={waiveTarget}
              busy={actionBusy}
              error={actionError}
              onSubmit={handleWaiveSubmit}
              onClose={() => {
                setWaiveTarget(null);
                setActionError(null);
              }}
            />
          )}
        </main>
      </div>
    </>
  );
};

const AdminStatementDetail = () => {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return <Navigate to="/earnings" replace />;
  }

  return statementsLive ? <LiveBatchDetail /> : <MockStatementDetail />;
};

export default AdminStatementDetail;
