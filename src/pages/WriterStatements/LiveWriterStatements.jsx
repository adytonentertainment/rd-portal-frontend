import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaFileInvoiceDollar, FaDownload, FaHourglassHalf } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { listMyWriters, listMyStatements, downloadMyStatementPdf } from '../../api/portal';
import '../Revenue/revenue.css';
import styles from './writerStatements.module.css';

const fmtMoney = (n) =>
  '$' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// period_code looks like "PUB25Q4", "PUB26H1", "PUB26Q2".
const yearOf = (period) => {
  const m = /PUB(\d{2})/.exec(period || '');
  return m ? 2000 + Number(m[1]) : '—';
};
const periodLabel = (period) => {
  const m = /PUB\d{2}([QH]\d)/.exec(period || '');
  const yr = yearOf(period);
  return m ? `${m[1]} ${yr}` : period || '—';
};
// Sort key within a year: later half/quarter first.
const periodRank = (period) => {
  const m = /PUB\d{2}([QH])(\d)/.exec(period || '');
  if (!m) return 0;
  return (m[1] === 'H' ? 10 : 0) + Number(m[2]);
};

// Live writer portal: the signed-in contact's own writers + the statements the
// publisher has actually distributed to them. No demo data, no persona — the
// backend scopes everything to whoever the Bearer token belongs to.
const LiveWriterStatements = () => {
  const [writers, setWriters] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ws, sts] = await Promise.all([listMyWriters(), listMyStatements()]);
        if (cancelled) return;
        setWriters(Array.isArray(ws) ? ws : []);
        setStatements(Array.isArray(sts) ? sts : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load your statements.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const writerName = useMemo(() => {
    if (writers.length === 1) return writers[0].name;
    if (writers.length > 1) return writers.map((w) => w.name).join(', ');
    return null;
  }, [writers]);

  const total = useMemo(() => statements.reduce((s, r) => s + (Number(r.payable) || 0), 0), [statements]);

  const byYear = useMemo(() => {
    const groups = {};
    for (const s of statements) {
      const y = yearOf(s.period_code);
      (groups[y] = groups[y] || []).push(s);
    }
    return Object.entries(groups)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([year, rows]) => [year, rows.sort((a, b) => periodRank(b.period_code) - periodRank(a.period_code))]);
  }, [statements]);

  const handleDownload = async (s) => {
    setDownloadingId(s.distribution_id);
    setError(null);
    try {
      const blob = await downloadMyStatementPdf(s.distribution_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = `${writers.find((w) => w.id === s.writer_id)?.name || 'statement'}_${s.period_code}_${s.catalog}`
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_|_$/g, '');
      a.href = url;
      a.download = `${safe}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'That statement could not be downloaded.');
    } finally {
      setDownloadingId(null);
    }
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
              <h1 className="revenue-title">Statements</h1>
              <p className="revenue-subtitle">
                {writerName
                  ? `Royalty statements distributed to ${writerName} by your publisher.`
                  : 'Download the royalty statements your publisher has distributed to you.'}
              </p>
            </div>
            {statements.length > 0 && (
              <div className={styles.totalPill}>
                <span className={styles.totalLabel}>Total distributed</span>
                <span className={styles.totalValue}>{fmtMoney(total)}</span>
              </div>
            )}
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {loading ? (
            <div className={styles.emptyCard}>
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div className={styles.emptyTitle}>Loading your statements…</div>
              </div>
            </div>
          ) : statements.length === 0 ? (
            <div className={styles.emptyCard}>
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div className={styles.emptyTitle}>No statements available yet</div>
                <div className={styles.emptyBody}>
                  Your statements are being finalised by your publisher. Once they are distributed they will appear
                  here, ready to download.
                </div>
              </div>
            </div>
          ) : (
            byYear.map(([year, rows]) => (
              <div key={year} className={styles.yearSection}>
                <div className={styles.yearHeading}>{year}</div>
                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Statement</th>
                        <th>Period</th>
                        <th>Distributed</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        <tr key={s.distribution_id}>
                          <td>
                            <span className={styles.stmtCell}>
                              <span className={styles.stmtIcon}>
                                <FaFileInvoiceDollar size={13} />
                              </span>
                              <span className={styles.stmtName}>{s.catalog}</span>
                            </span>
                          </td>
                          <td className={styles.muted}>{periodLabel(s.period_code)}</td>
                          <td className={styles.muted}>{fmtDate(s.published_at)}</td>
                          <td className={styles.amount}>{fmtMoney(s.payable)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className={styles.downloadBtn}
                              onClick={() => handleDownload(s)}
                              disabled={downloadingId === s.distribution_id}
                            >
                              <FaDownload size={11} />{' '}
                              {downloadingId === s.distribution_id ? 'Downloading…' : 'Download PDF'}
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

export default LiveWriterStatements;
