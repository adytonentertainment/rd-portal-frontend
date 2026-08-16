import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { getDistributionPeriodById, closeDistributionPeriod } from '../../mocks/statementsAdminData';
import { MOCK_WRITERS } from '../../mocks/roster';
import styles from './adminDistributionDetail.module.css';

const STATUS_COLORS = {
  open: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  closed: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
};

const FEE_RATE = 0.2; // 20%

// Writer payout distribution weights (Demo Writer largest, M. Okonkwo smallest)
const WRITER_WEIGHTS = {
  '-1': 0.45, // Demo Writer
  '-2': 0.2, // Ava Brooks
  '-3': 0.1, // M. Okonkwo
  '-4': 0.25, // The Vine Sessions
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatPercent = (rate) => {
  return `${(rate * 100).toFixed(0)}%`;
};

const AdminDistributionDetail = () => {
  const isAdmin = useIsAdmin();
  const { periodId } = useParams();
  const [currentStatus, setCurrentStatus] = useState(null);

  const period = getDistributionPeriodById(periodId);
  const effectiveStatus = currentStatus || period?.status;

  // Calculate per-writer payouts
  const writerPayouts = useMemo(() => {
    if (!period) return [];

    return MOCK_WRITERS.map((writer) => {
      const weight = WRITER_WEIGHTS[String(writer.id)] || 0.1;
      const gross = period.totalGross * weight;
      const fee = gross * FEE_RATE;
      const recoupment = 0; // No recoupment for demo
      const net = gross - fee - recoupment;
      const worksCount = writer.catalog?.length || 0;

      return {
        id: writer.id,
        name: writer.name,
        worksCount,
        gross,
        feeRate: FEE_RATE,
        recoupment,
        net,
      };
    }).sort((a, b) => b.gross - a.gross); // Sort by gross descending
  }, [period]);

  // Calculate totals
  const totals = useMemo(() => {
    return writerPayouts.reduce(
      (acc, p) => ({
        worksCount: acc.worksCount + p.worksCount,
        gross: acc.gross + p.gross,
        recoupment: acc.recoupment + p.recoupment,
        net: acc.net + p.net,
      }),
      { worksCount: 0, gross: 0, recoupment: 0, net: 0 }
    );
  }, [writerPayouts]);

  if (!isAdmin) {
    return <Navigate to="/earnings" replace />;
  }

  if (!period) {
    return (
      <>
        <Helmet>
          <title>Period Not Found | Admin | RD</title>
        </Helmet>
        <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
          <Sidebar />
          <main className={styles.shell}>
            <Link to="/admin/distributions" className={styles.backLink}>
              <FaArrowLeft size={12} />
              Back to Distributions
            </Link>
            <div className={styles.notFound}>
              <h1 className={styles.notFoundTitle}>Period Not Found</h1>
              <p className={styles.notFoundText}>The distribution period you are looking for does not exist.</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  const handleDistribute = () => {
    if (
      window.confirm(
        `Are you sure you want to close and distribute ${period.periodLabel}? This action cannot be undone.`
      )
    ) {
      closeDistributionPeriod(periodId);
      setCurrentStatus('closed');
    }
  };

  const statusStyle = STATUS_COLORS[effectiveStatus] || STATUS_COLORS.open;
  const isClosed = effectiveStatus === 'closed';

  return (
    <>
      <Helmet>
        <title>{period.periodLabel} Distribution | Admin | RD</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <Link to="/admin/distributions" className={styles.backLink}>
            <FaArrowLeft size={12} />
            Back to Distributions
          </Link>

          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{period.periodLabel}</h1>
                <span
                  className={styles.statusPill}
                  style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                >
                  {effectiveStatus}
                </span>
              </div>
              <div className={styles.meta}>
                <span>Gross: {formatCurrency(period.totalGross)}</span>
                <span>Fees: {formatCurrency(period.fees)}</span>
                <span>Net: {formatCurrency(period.totalNet)}</span>
              </div>
            </div>
            <div className={styles.headerRight}>
              {isClosed ? (
                <button className={styles.distributeButton} disabled>
                  <FaCheck size={12} />
                  Distributed
                </button>
              ) : (
                <button className={styles.distributeButton} onClick={handleDistribute}>
                  Distribute
                </button>
              )}
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Writer</th>
                  <th>Works in Period</th>
                  <th>Gross</th>
                  <th>Fee %</th>
                  <th>Recoupment</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {writerPayouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className={styles.writerName}>{payout.name}</td>
                    <td>{payout.worksCount}</td>
                    <td className={styles.amount}>{formatCurrency(payout.gross)}</td>
                    <td>{formatPercent(payout.feeRate)}</td>
                    <td className={styles.amount}>{formatCurrency(payout.recoupment)}</td>
                    <td className={styles.amount}>{formatCurrency(payout.net)}</td>
                  </tr>
                ))}
                <tr className={styles.totalsRow}>
                  <td>Total</td>
                  <td>{totals.worksCount}</td>
                  <td className={styles.amount}>{formatCurrency(totals.gross)}</td>
                  <td>{formatPercent(FEE_RATE)}</td>
                  <td className={styles.amount}>{formatCurrency(totals.recoupment)}</td>
                  <td className={styles.amount}>{formatCurrency(totals.net)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDistributionDetail;
