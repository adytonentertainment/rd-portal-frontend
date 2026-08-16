import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaFileInvoiceDollar, FaDownload, FaHourglassHalf } from 'react-icons/fa';
import LanguageToggle from '../../components/LanguageToggle/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useClientContext } from '../../components/ClientContext/ClientContext';
import { useIsAdmin } from '../../utils/auth';
import { getWriterPersonaId } from '../../utils/persona';
import {
  hasAnyDistribution,
  getDistributedPeriods,
  subscribe as subscribeDistribution,
  CURRENT_PERIOD,
} from '../../mocks/distributionState';
import { getEarningsForClient, getTransactionsForClient } from '../../mocks/earningsData';
import { brand } from '../../config/brand';
import { statementsLive } from '../../config/featureFlags';
import LiveWriterStatements from './LiveWriterStatements';
import '../Revenue/revenue.css';
import styles from './writerStatements.module.css';

const fmtMoney = (n) =>
  '$' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// Quote a CSV cell if it contains a comma, quote or newline.
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const WriterStatements = () => {
  // Live mode: real signed-in writer reads their own distributed statements
  // from the backend. The demo/persona path below is the localStorage-only build.
  if (statementsLive) return <LiveWriterStatements />;
  return <DemoWriterStatements />;
};

const DemoWriterStatements = () => {
  const isAdmin = useIsAdmin();
  const { t } = useLanguage();
  const { selectedClientId, selectedClient } = useClientContext();
  const [, force] = useState(0);
  useEffect(() => subscribeDistribution(() => force((x) => x + 1)), []);

  // Resolve the writer: their own persona in the writer portal, or the client
  // the admin currently has selected. Statements still only appear once the
  // publisher has clicked Distribute — uploading alone never reveals them.
  const writerId = getWriterPersonaId() ?? selectedClientId;
  const distributed = writerId != null ? getDistributedPeriods(writerId) : [];
  const hasDist = writerId != null && hasAnyDistribution(writerId);

  const earnings = writerId != null ? getEarningsForClient(writerId, selectedClient?.name) : null;
  // Only surface statements whose period has actually been distributed.
  const statements = (earnings?.statements || []).filter((s) => distributed.includes(s.period));

  // Group statements by year, newest first, and newest period first within a year.
  const yearOf = (s) => /(\d{4})/.exec(s.period || '')?.[1] || '—';
  const halfOf = (s) => Number(/H([12])/.exec(s.period || '')?.[1]) || 0;
  const statementsByYear = [];
  {
    const byYear = {};
    const sorted = [...statements].sort((a, b) => {
      const ya = Number(yearOf(a)) || 0;
      const yb = Number(yearOf(b)) || 0;
      return yb - ya || halfOf(b) - halfOf(a);
    });
    for (const s of sorted) {
      const y = yearOf(s);
      if (!byYear[y]) {
        byYear[y] = [];
        statementsByYear.push([y, byYear[y]]);
      }
      byYear[y].push(s);
    }
  }

  const downloadStatement = (statement) => {
    const allTxns = getTransactionsForClient(writerId, selectedClient?.name);
    // Match the statement's line items: same period, and same statement type if the
    // transaction carries one (RedZed real data does; synthesized writers may not).
    const typeKey = statement.source
      .replace(/^Ben\s+/i, '')
      .trim()
      .toLowerCase();
    const lines = allTxns.filter((t) => {
      if (t.period !== statement.period) return false;
      if (t.statementType) return t.statementType.toLowerCase() === typeKey;
      return true;
    });

    const header = ['Work', 'Source / Platform', 'Territory', 'Income Type', 'Units', 'Amount (USD)'];
    const rows = lines.map((t) => [
      t.product || t.title || '',
      t.platform || t.source || '',
      t.territoryName || t.territory || '',
      t.incomeName || '',
      t.units ?? '',
      (t.amount ?? 0).toFixed(4),
    ]);
    const total = lines.reduce((s, t) => s + (t.amount || 0), 0);
    const meta = [
      [`${brand.publisherName} — Royalty Statement`],
      [`Writer`, selectedClient?.name || earnings?.writerName || 'Writer'],
      [`Statement`, statement.source],
      [`Period`, statement.period],
      [`Statement date`, statement.date],
      [`Total`, total.toFixed(2)],
      [],
    ];
    const csv = [...meta, header, ...rows, [], ['', '', '', '', 'TOTAL', total.toFixed(2)]]
      .map((r) => r.map(csvCell).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = `${selectedClient?.name || 'writer'}_${statement.source}_${statement.period}`
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_|_$/g, '');
    a.href = url;
    a.download = `${safeName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>RD - Statements</title>
      </Helmet>
      <div className="revenue-page">
        <div className="revenue-background" />
        <Sidebar />
        <div className="revenue-content">
          <div className="revenue-header">
            <div>
              <h1 className="revenue-title">{t('statements.title')}</h1>
              <p className="revenue-subtitle">{t('statements.subtitle')}</p>
            </div>
            {/* Same ES/EN switch as the earnings page, so the choice is
                reachable from either portal screen. */}
            {!isAdmin && (
              <div className="header-controls">
                <LanguageToggle />
              </div>
            )}
          </div>

          {!hasDist || statements.length === 0 ? (
            <div className={styles.emptyCard}>
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div className={styles.emptyTitle}>{t('statements.emptyTitle')}</div>
                <div className={styles.emptyBody}>
                  {isAdmin ? t('statements.emptyBody') : t('statements.pendingBody', { period: CURRENT_PERIOD })}
                </div>
              </div>
            </div>
          ) : (
            statementsByYear.map(([year, yearStatements]) => (
              <div key={year} className={styles.yearSection}>
                <div className={styles.yearHeading}>{year}</div>
                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t('statements.colStatement')}</th>
                        <th>{t('statements.colPeriod')}</th>
                        <th>{t('statements.colDate')}</th>
                        <th style={{ textAlign: 'right' }}>{t('statements.colAmount')}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {yearStatements.map((s, i) => (
                        <tr key={i}>
                          <td>
                            <span className={styles.stmtCell}>
                              <span className={styles.stmtIcon}>
                                <FaFileInvoiceDollar size={13} />
                              </span>
                              <span className={styles.stmtName}>{s.source}</span>
                            </span>
                          </td>
                          <td className={styles.muted}>{s.period}</td>
                          <td className={styles.muted}>{fmtDate(s.date)}</td>
                          <td className={styles.amount}>{fmtMoney(s.amount)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className={styles.downloadBtn} onClick={() => downloadStatement(s)}>
                              <FaDownload size={11} /> Download CSV
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default WriterStatements;
