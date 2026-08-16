import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/Sidebar';
import styles from './adminDistributions.module.css';

const STATUS_COLORS = {
  open: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  closed: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Original mock-data distributions table (demo build only).
const DemoDistributions = ({ periods }) => {
  const navigate = useNavigate();
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
            <p className={styles.subtitle}>Manage quarterly distribution periods and writer payouts</p>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Total Gross</th>
                  <th>Fees</th>
                  <th>Total Net</th>
                  <th>Status</th>
                  <th>Distributed</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const statusStyle = STATUS_COLORS[period.status] || STATUS_COLORS.open;
                  return (
                    <tr key={period.id} onClick={() => navigate(`/admin/distributions/${period.id}`)}>
                      <td className={styles.periodLabel}>{period.periodLabel}</td>
                      <td className={styles.amount}>{formatCurrency(period.totalGross)}</td>
                      <td className={styles.amount}>{formatCurrency(period.fees)}</td>
                      <td className={styles.amount}>{formatCurrency(period.totalNet)}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                        >
                          {period.status}
                        </span>
                      </td>
                      <td className={styles.date}>{formatDate(period.distributedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
};

export default DemoDistributions;
