import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { statementsLive } from '../../config/featureFlags';
import { getDistributionPeriods } from '../../mocks/statementsAdminData';
import { listDistributionPeriods } from '../../api/statementsAdmin';
import DemoDistributions from './DemoDistributions';
import styles from './adminDistributions.module.css';

const STATUS_COLORS = {
  distributed: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  partial: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  pending: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
};

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Live admin Distributions: real per-period rollup from the backend — statement
// count, total NET payable to writers, and distribution status/date. No fabricated
// gross/fee columns (that split isn't stored per period). The demo build keeps
// its mock table via DemoDistributions.
const AdminDistributions = () => {
  const isAdmin = useIsAdmin();
  const [periods, setPeriods] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!statementsLive) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listDistributionPeriods();
        if (!cancelled) setPeriods(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load distributions.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) {
    return <Navigate to="/earnings" replace />;
  }

  // Demo build: keep the original mock table (getDistributionPeriods is unused
  // live, referenced here so lint sees the demo dependency).
  if (!statementsLive) {
    return <DemoDistributions periods={getDistributionPeriods()} />;
  }

  return (
    <>
      <Helmet>
        <title>Distributions | Admin | RD</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <div className={styles.header}>
            <h1 className={styles.title}>Distributions</h1>
            <p className={styles.subtitle}>Net payable to writers by reporting period, and what&apos;s been sent</p>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Statements</th>
                  <th>Total Net</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Distributed</th>
                </tr>
              </thead>
              <tbody>
                {periods === null ? (
                  <tr>
                    <td colSpan={6} className={styles.date}>
                      Loading…
                    </td>
                  </tr>
                ) : periods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.date}>
                      No distributions yet — upload and distribute statements first.
                    </td>
                  </tr>
                ) : (
                  periods.map((p) => {
                    const s = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
                    return (
                      <tr key={p.period_code}>
                        <td className={styles.periodLabel}>{p.label}</td>
                        <td className={styles.amount}>{p.statements.toLocaleString()}</td>
                        <td className={styles.amount}>{fmtMoney(p.net_total)}</td>
                        <td>
                          <span className={styles.statusPill} style={{ backgroundColor: s.bg, color: s.color }}>
                            {p.status}
                          </span>
                        </td>
                        <td className={styles.amount}>
                          {p.distributed.toLocaleString()} / {p.statements.toLocaleString()}
                        </td>
                        <td className={styles.date}>{fmtDate(p.distributed_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDistributions;
