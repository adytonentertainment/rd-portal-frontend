import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaFileInvoiceDollar, FaDownload, FaFileExcel, FaHourglassHalf } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { listMyWriters, listMyStatements, downloadMyStatementPdf, downloadMyStatementXlsx } from '../../api/portal';
import { useLanguage } from '../../i18n/LanguageContext';
import AccessPanel from './AccessPanel';
import WriterSwitcher, { useActiveWriter } from '../../components/WriterSwitcher/WriterSwitcher';
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
  const { t } = useLanguage();
  const [writers, setWriters] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [activeId, setActiveId] = useActiveWriter(writers);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Writers first: which clients this login holds decides what the
        // switcher offers and which one the statements are read for.
        const ws = await listMyWriters();
        if (cancelled) return;
        const list = Array.isArray(ws) ? ws : [];
        setWriters(list);
        const scope = list.some((w) => w.id === activeId) ? activeId : list[0]?.id;
        const sts = await listMyStatements(scope);
        if (cancelled) return;
        setStatements(Array.isArray(sts) ? sts : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || t('statements.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // The client currently being read. Previously this joined every client's
  // name into one line, which described a combined view the portal no longer
  // shows.
  const activeName = useMemo(() => writers.find((w) => w.id === activeId)?.name || null, [writers, activeId]);

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

  // One handler, two formats. The PDF is the statement of record; the XLSX is
  // the same statement as the publisher issued it, so it can be summed and
  // filtered instead of read. Both are the original files — regenerating a
  // spreadsheet from parsed line items would quietly disagree with the PDF the
  // moment parsing missed a column, and clients read the two side by side.
  const handleDownload = async (s, format = 'pdf') => {
    const busyKey = `${s.distribution_id}:${format}`;
    setDownloadingId(busyKey);
    setError(null);
    try {
      const blob =
        format === 'xlsx'
          ? await downloadMyStatementXlsx(s.distribution_id)
          : await downloadMyStatementPdf(s.distribution_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = `${writers.find((w) => w.id === s.writer_id)?.name || 'statement'}_${s.period_code}_${s.catalog}`
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_|_$/g, '');
      a.href = url;
      a.download = `${safe}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || t('statements.downloadError'));
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
              <h1 className="revenue-title">{t('statements.title')}</h1>
              <p className="revenue-subtitle">
                {activeName ? t('statements.subtitleNamed', { name: activeName }) : t('statements.subtitle')}
              </p>
            </div>
            <WriterSwitcher writers={writers} activeId={activeId} onChange={setActiveId} />
            {statements.length > 0 && (
              <div className={styles.totalPill}>
                <span className={styles.totalLabel}>{t('statements.totalDistributed')}</span>
                <span className={styles.totalValue}>{fmtMoney(total)}</span>
              </div>
            )}
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          {loading ? (
            <div className={styles.emptyCard}>
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div className={styles.emptyTitle}>{t('statements.loading')}</div>
              </div>
            </div>
          ) : statements.length === 0 ? (
            <div className={styles.emptyCard}>
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div className={styles.emptyTitle}>{t('statements.emptyTitle')}</div>
                <div className={styles.emptyBody}>{t('statements.emptyBodyLive')}</div>
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
                        <th>{t('statements.colStatement')}</th>
                        <th>{t('statements.colPeriod')}</th>
                        <th>{t('statements.colDistributed')}</th>
                        <th style={{ textAlign: 'right' }}>{t('statements.colAmount')}</th>
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
                            <span className={styles.downloadGroup}>
                              {s.has_pdf !== false && (
                                <button
                                  className={styles.downloadBtn}
                                  onClick={() => handleDownload(s, 'pdf')}
                                  disabled={downloadingId === `${s.distribution_id}:pdf`}
                                >
                                  <FaDownload size={11} />{' '}
                                  {downloadingId === `${s.distribution_id}:pdf`
                                    ? t('statements.downloading')
                                    : t('statements.downloadPdf')}
                                </button>
                              )}
                              {/* Only offered when the file is really there —
                                  a button that 404s is worse than no button. */}
                              {s.has_xlsx && (
                                <button
                                  className={styles.downloadBtnAlt}
                                  onClick={() => handleDownload(s, 'xlsx')}
                                  disabled={downloadingId === `${s.distribution_id}:xlsx`}
                                >
                                  <FaFileExcel size={11} />{' '}
                                  {downloadingId === `${s.distribution_id}:xlsx`
                                    ? t('statements.downloading')
                                    : t('statements.downloadXlsx')}
                                </button>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          {writers.map((w) => (
            <AccessPanel key={w.id} writer={w} />
          ))}
        </div>
      </div>
    </>
  );
};

export default LiveWriterStatements;
