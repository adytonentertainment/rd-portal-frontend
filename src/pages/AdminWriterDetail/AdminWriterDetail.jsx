import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaPaperPlane, FaClock, FaEnvelope, FaPen } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { statementsLive } from '../../config/featureFlags';
import { getWriter } from '../../api/writersAdmin';
import WriterFormModal from '../AdminWriters/WriterFormModal';
import InviteDialog from '../AdminWriters/InviteDialog';
import {
  getWriterDetail,
  distributeWriter,
  subscribe,
  getDocStatus,
  getDistributedPeriods,
  getWriterPeriods,
  getDistributionDate,
} from '../../mocks/distributionState';
import { brand } from '../../config/brand';
import styles from './adminWriterDetail.module.css';

const KIND_LABEL = { client: 'Client', commission_partner: 'Commission partner' };
const CAT_LABEL = { MECH: 'Mechanical Royalties', YT: 'YouTube Publishing', PERF: 'Performance Royalties' };
const LANG_LABEL = { en: 'English', es: 'Español' };
const cadenceLabel = (c) =>
  c === 'quarterly' ? 'Quarterly' : c === 'semiannual' ? 'Semiannual' : 'Semiannual (default)';
const initialsOf = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// "PUB25H2" → { year: '2025', label: 'H2 2025' }
const parsePeriod = (code = '') => {
  const m = /PUB(\d{2})([HQ])(\d)/i.exec(code);
  if (!m) return { year: '—', label: code || '—' };
  const year = `20${m[1]}`;
  return { year, label: `${m[2].toUpperCase()}${m[3]} ${year}` };
};

const fmtMoney = (n) =>
  '$' + Math.round(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const AdminWriterDetail = () => {
  const isAdmin = useIsAdmin();
  const { id } = useParams();
  const navigate = useNavigate();
  const [, force] = useState(0);
  const [confirm, setConfirm] = useState(false);

  const live = statementsLive;
  const [liveWriter, setLiveWriter] = useState(null);
  const [liveLoading, setLiveLoading] = useState(statementsLive);
  const [liveError, setLiveError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const loadLive = useCallback(async () => {
    if (!live) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      setLiveWriter(await getWriter(id));
    } catch (err) {
      setLiveError(err?.status === 404 ? 'Client not found.' : err?.message || 'Could not load client.');
    } finally {
      setLiveLoading(false);
    }
  }, [live, id]);

  useEffect(() => {
    loadLive();
  }, [loadLive]);

  useEffect(() => subscribe(() => force((x) => x + 1)), []);

  if (!isAdmin) return <Navigate to="/earnings" replace />;

  // --- Live mode: real backend client (the demo store has no record of the
  // ingested roster, which is why clicking one used to say "writer not found").
  if (live) {
    const w = liveWriter;
    const primaryEmail = w?.contacts?.find((c) => c.role === 'primary')?.email || w?.contacts?.[0]?.email || '';
    const portalLabel = w?.portal_status === 'active' ? 'Active' : w?.portal_status === 'invited' ? 'Invited' : 'None';
    // Group the client's statements by reporting period (newest first), then by
    // year — the demo's "statement history" layout, driven by real data.
    const stmts = w?.statements || [];
    const byPeriod = {};
    stmts.forEach((s) => {
      (byPeriod[s.period_code] = byPeriod[s.period_code] || []).push(s);
    });
    const stmtYears = [];
    const periodsByYear = {};
    Object.keys(byPeriod)
      .sort()
      .reverse()
      .forEach((pc) => {
        const { year } = parsePeriod(pc);
        if (!periodsByYear[year]) {
          periodsByYear[year] = [];
          stmtYears.push(year);
        }
        periodsByYear[year].push(pc);
      });
    // "Received" = both files in (paired). Reconciliation (do the numbers agree?)
    // is shown separately as a ⚠ flag, never as "missing" — consistent with the
    // dashboard's completeness axis.
    const isComplete = (s) => s.paired;
    // The revenue types REQUIRED for this client — exactly the demo's model, but
    // per-client: their expected catalogs (from the client list). When those
    // aren't set (ingest-only clients), infer them from the revenue types they
    // actually receive. A period is "complete" only when every required type
    // has a paired + reconciled statement — matching how often + what they're
    // paid for. Import the client list to make `expected_catalogs` authoritative.
    const requiredCatalogs =
      w?.expected_catalogs && w.expected_catalogs.length
        ? w.expected_catalogs
        : [...new Set(stmts.map((s) => s.catalog).filter(Boolean))];
    return (
      <>
        <Helmet>
          <title>{w ? w.canonical_name : 'Client'} · Admin</title>
        </Helmet>
        <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
          <Sidebar />
          <main className={styles.shell}>
            <button className={styles.backBtn} onClick={() => navigate('/admin/writers')}>
              <FaArrowLeft size={11} /> All clients
            </button>

            {liveLoading ? (
              <div className={styles.empty}>Loading client…</div>
            ) : liveError || !w ? (
              <div className={styles.empty}>{liveError || 'Client not found.'}</div>
            ) : (
              <>
                <div className={styles.header}>
                  <div className={styles.identity}>
                    <span className={styles.avatar} style={{ background: 'var(--accent)' }}>
                      {initialsOf(w.canonical_name)}
                    </span>
                    <div>
                      <h1 className={styles.title}>{w.canonical_name}</h1>
                      <p className={styles.subtitle}>
                        {KIND_LABEL[w.kind] || 'Client'}
                        {w.payee_name ? ` · payee ${w.payee_name}` : ''}
                        {w.status ? ` · ${w.status}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'inline-flex', gap: 10 }}>
                    <button className={styles.backBtn} onClick={() => setShowEdit(true)}>
                      <FaPen size={11} /> Edit
                    </button>
                    <button className={styles.distributeCta} onClick={() => setShowInvite(true)}>
                      <FaEnvelope size={11} /> Invite to portal
                    </button>
                  </div>
                </div>

                {w.needs_info && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      margin: '0 0 18px',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#f59e0b',
                      fontSize: 14,
                    }}
                  >
                    <FaClock size={14} />
                    <span style={{ flex: 1 }}>
                      This client was created from statement files and is missing client info:{' '}
                      <strong>{(w.missing_info || []).join(', ')}</strong>. Completeness can’t be verified until it’s
                      set.
                    </span>
                    <button className={styles.distributeCta} onClick={() => setShowEdit(true)}>
                      <FaPen size={11} /> Add info
                    </button>
                  </div>
                )}

                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Beneficiary accounts</span>
                    <span className={styles.kpiValue}>{w.accounts.length}</span>
                    <span className={styles.kpiHint}>
                      {w.expected_catalogs?.length
                        ? `Catalogs: ${w.expected_catalogs.join(', ')}`
                        : 'No expected catalogs set'}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Portal access</span>
                    <span className={styles.kpiValue}>{portalLabel}</span>
                    <span className={styles.kpiHint}>{primaryEmail || 'no contact email'}</span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Contacts</span>
                    <span className={styles.kpiValue}>{w.contacts.length}</span>
                    <span className={styles.kpiHint}>{cadenceLabel(w.cadence)}</span>
                  </div>
                </div>

                {/* Everything imported from the client list. */}
                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Client profile</span>
                    <span className={styles.panelSub}>From the client list</span>
                  </div>
                  <div className={styles.liveRows}>
                    <div className={styles.liveRow}>
                      <span className={styles.liveSoft}>Payee name</span>
                      <span>{w.payee_name || '—'}</span>
                    </div>
                    <div className={styles.liveRow}>
                      <span className={styles.liveSoft}>Type</span>
                      <span>{KIND_LABEL[w.kind] || '—'}</span>
                    </div>
                    <div className={styles.liveRow}>
                      <span className={styles.liveSoft}>Admin type (revenue)</span>
                      <span>
                        {w.expected_catalogs?.length
                          ? w.expected_catalogs.map((c) => CAT_LABEL[c] || c).join(', ')
                          : '—'}
                      </span>
                    </div>
                    <div className={styles.liveRow}>
                      <span className={styles.liveSoft}>Preferred language</span>
                      <span>{LANG_LABEL[w.preferred_language] || '—'}</span>
                    </div>
                    <div className={styles.liveRow}>
                      <span className={styles.liveSoft}>Payment cadence</span>
                      <span>{cadenceLabel(w.cadence)}</span>
                    </div>
                  </div>
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Statement history</span>
                    <span className={styles.panelSub}>
                      Documentation completeness &amp; distribution status by reporting period
                    </span>
                  </div>
                  {stmts.length === 0 ? (
                    <div className={styles.empty}>No statements ingested for this client yet.</div>
                  ) : (
                    <div className={styles.yearList}>
                      {stmtYears.map((year) => (
                        <div key={year} className={styles.yearGroup}>
                          <div className={styles.yearLabel}>{year}</div>
                          <div className={styles.periodList}>
                            {periodsByYear[year].map((pc) => {
                              const items = byPeriod[pc];
                              const { label } = parsePeriod(pc);
                              // One row per REQUIRED revenue type: its statement for
                              // this period (if any) and whether it's complete. The
                              // period is "Complete" only when every required type is in.
                              const reqRows = requiredCatalogs.map((cat) => {
                                const catStmts = items.filter((i) => i.catalog === cat);
                                const done = catStmts.length > 0 && catStmts.every(isComplete);
                                return { cat, s: catStmts[0], count: catStmts.length, done };
                              });
                              const completeCount = reqRows.filter((r) => r.done).length;
                              const total = reqRows.length;
                              const allComplete = total > 0 && completeCount === total;
                              const status = allComplete
                                ? { label: 'Complete', cls: styles.pillReady }
                                : { label: `Awaiting ${total - completeCount}`, cls: styles.pillAwaiting };
                              return (
                                <div key={pc} className={styles.periodGroup}>
                                  <div className={styles.periodGroupHead}>
                                    <span className={styles.periodName}>{label}</span>
                                    <span className={styles.periodMeta}>
                                      {completeCount}/{total} required statement{total === 1 ? '' : 's'}
                                    </span>
                                    <span className={`${styles.statusPill} ${status.cls}`}>
                                      {allComplete ? <FaCheck size={9} /> : <FaClock size={9} />}
                                      {status.label}
                                    </span>
                                  </div>
                                  <ul className={styles.checklist}>
                                    {reqRows.map(({ cat, s, count, done }) => (
                                      <li
                                        key={cat}
                                        className={`${styles.checkRow} ${done ? styles.checkReceived : styles.checkMissing}`}
                                      >
                                        <span className={styles.checkIcon}>
                                          {done ? <FaCheck size={11} /> : <FaClock size={11} />}
                                        </span>
                                        <span className={styles.checkSource}>
                                          {CAT_LABEL[cat] || cat}
                                          {count > 1 ? ` · ${count} accounts` : ''}
                                        </span>
                                        <span className={styles.checkLabel}>
                                          {!s ? (
                                            <span style={{ color: '#f59e0b' }}>not received</span>
                                          ) : (
                                            <>
                                              <span style={{ color: s.xlsx_present ? '#22c55e' : '#f59e0b' }}>
                                                XLSX {s.xlsx_present ? '✓' : 'missing'}
                                              </span>
                                              {' · '}
                                              <span style={{ color: s.pdf_present ? '#22c55e' : '#f59e0b' }}>
                                                PDF {s.pdf_present ? '✓' : 'missing'}
                                              </span>
                                              {s.reconciled === false && (
                                                <span style={{ color: '#f59e0b' }}> · ⚠ mismatch</span>
                                              )}
                                            </>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Beneficiary accounts</span>
                    <span className={styles.panelSub}>Read-only · re-point accounts in the client-import queue</span>
                  </div>
                  {w.accounts.length === 0 ? (
                    <div className={styles.empty}>No accounts linked yet.</div>
                  ) : (
                    <div className={styles.liveRows}>
                      {w.accounts.map((a) => (
                        <div key={a.id} className={styles.liveRow}>
                          <code className={styles.liveCode}>{a.account_code}</code>
                          <span>{a.catalog || '—'}</span>
                          <span className={styles.liveSoft}>{a.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Contacts &amp; portal invites</span>
                  </div>
                  {w.contacts.length === 0 && w.invites.filter((i) => i.active || i.accepted).length === 0 ? (
                    <div className={styles.empty}>
                      No contacts yet. Use “Invite to portal” to grant this client access.
                    </div>
                  ) : (
                    <div className={styles.liveRows}>
                      {w.contacts.map((c) => (
                        <div key={`c${c.contact_id}`} className={styles.liveRow}>
                          <span>
                            {c.display_name ? `${c.display_name} · ` : ''}
                            {c.email}
                          </span>
                          <span className={styles.liveSoft}>{c.role}</span>
                          <span className={styles.liveSoft}>{c.has_login ? 'portal login' : 'no login'}</span>
                        </div>
                      ))}
                      {w.invites
                        .filter((i) => i.active && !i.accepted)
                        .map((i) => (
                          <div key={`i${i.id}`} className={styles.liveRow}>
                            <span>{i.email}</span>
                            <span className={styles.liveSoft}>{i.role}</span>
                            <span style={{ color: '#f59e0b' }}>invite pending</span>
                          </div>
                        ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </main>
        </div>

        {showEdit && w && (
          <WriterFormModal
            writer={w}
            onClose={() => setShowEdit(false)}
            onSaved={() => {
              setShowEdit(false);
              loadLive();
            }}
          />
        )}
        {showInvite && w && (
          <InviteDialog
            writer={{ id: w.id, canonical_name: w.canonical_name, primary_email: primaryEmail }}
            onClose={() => setShowInvite(false)}
            onChanged={loadLive}
          />
        )}
      </>
    );
  }

  const writer = getWriterDetail(id);
  if (!writer) {
    return (
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <div className={styles.empty}>Writer not found.</div>
        </main>
      </div>
    );
  }

  // Every reporting half-year, newest first, grouped into years for display.
  const periods = getWriterPeriods(writer.id);
  const distributedPeriods = getDistributedPeriods(writer.id);
  const years = [];
  const periodsByYear = {};
  for (const p of periods) {
    const y = /(\d{4})/.exec(p)?.[1] || '—';
    if (!periodsByYear[y]) {
      periodsByYear[y] = [];
      years.push(y);
    }
    periodsByYear[y].push(p);
  }

  const handleDistribute = () => {
    if (writer.blockCount > 0) return;
    distributeWriter(writer.id);
    setConfirm(false);
  };

  return (
    <>
      <Helmet>
        <title>{writer.name} · Admin</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <button className={styles.backBtn} onClick={() => navigate('/admin')}>
            <FaArrowLeft size={11} /> All writers
          </button>

          <div className={styles.header}>
            <div className={styles.identity}>
              <span className={styles.avatar} style={{ background: writer.color }}>
                {writer.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <div>
                <h1 className={styles.title}>{writer.name}</h1>
                <p className={styles.subtitle}>
                  Administered by {brand.publisherName} · {writer.worksCount} works
                </p>
              </div>
            </div>
            <button className={styles.distributeCta} onClick={() => setConfirm(true)} disabled={!writer.ready}>
              <FaPaperPlane size={11} />{' '}
              {writer.ready
                ? `Distribute ${fmtMoney(writer.pending)}`
                : writer.pending === 0
                  ? 'Up to date'
                  : `Awaiting ${writer.docStatus.missing.length} item${writer.docStatus.missing.length === 1 ? '' : 's'}`}
            </button>
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Pending royalties</span>
              <span className={styles.kpiValue}>{fmtMoney(writer.pending)}</span>
              <span className={styles.kpiHint}>{writer.pendingLines.toLocaleString()} lines awaiting distribution</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Distributed lifetime</span>
              <span className={styles.kpiValue}>{fmtMoney(writer.distributedTotal)}</span>
              <span className={styles.kpiHint}>
                Last sent: {writer.lastDistributedAt ? fmtDate(writer.lastDistributedAt) : 'never'}
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Works in catalog</span>
              <span className={styles.kpiValue}>{writer.worksCount}</span>
              <span className={styles.kpiHint}>{writer.totalUsages.toLocaleString()} usages tracked</span>
            </div>
          </div>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Statement history</span>
              <span className={styles.panelSub}>
                Documentation completeness &amp; distribution status by reporting period
              </span>
            </div>
            <div className={styles.yearList}>
              {years.map((year) => (
                <div key={year} className={styles.yearGroup}>
                  <div className={styles.yearLabel}>{year}</div>
                  <div className={styles.periodList}>
                    {periodsByYear[year].map((period) => {
                      const doc = getDocStatus(writer.id, period);
                      const distributed = distributedPeriods.includes(period);
                      const distDate = getDistributionDate(writer.id, period);
                      const empty = !doc.anyReceived && !distributed;
                      const status = distributed
                        ? { label: 'Distributed', cls: styles.pillDistributed }
                        : doc.complete
                          ? { label: 'Ready to distribute', cls: styles.pillReady }
                          : doc.anyReceived
                            ? { label: `Awaiting ${doc.missing.length}`, cls: styles.pillAwaiting }
                            : { label: 'No statements', cls: styles.pillEmpty };
                      const half = period.replace(/\s+\d{4}$/, '');
                      return (
                        <div key={period} className={`${styles.periodGroup} ${empty ? styles.periodEmpty : ''}`}>
                          <div className={styles.periodGroupHead}>
                            <span className={styles.periodName}>{half}</span>
                            <span className={styles.periodMeta}>
                              {doc.receivedCount}/{doc.totalCount} required statements
                              {distributed && distDate ? ` · distributed ${fmtDate(distDate)}` : ''}
                            </span>
                            <span className={`${styles.statusPill} ${status.cls}`}>
                              {distributed ? <FaCheck size={9} /> : <FaClock size={9} />}
                              {status.label}
                            </span>
                          </div>
                          {!empty && (
                            <ul className={styles.checklist}>
                              {/* One row per statement type — its XLSX detail file. */}
                              {doc.items.map((item) => (
                                <li
                                  key={item.source}
                                  className={`${styles.checkRow} ${
                                    item.received ? styles.checkReceived : styles.checkMissing
                                  }`}
                                >
                                  <span className={styles.checkIcon}>
                                    {item.received ? <FaCheck size={11} /> : <FaClock size={11} />}
                                  </span>
                                  <span className={styles.checkSource}>{item.source}</span>
                                  <span className={styles.checkLabel}>
                                    {distributed && item.received ? (
                                      'Distributed'
                                    ) : (
                                      <span style={{ color: item.xlsx ? '#22c55e' : '#f59e0b' }}>
                                        XLSX {item.xlsx ? '✓ received' : 'missing'}
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                              {/* One master Summary PDF for the whole writer/period. */}
                              <li
                                className={`${styles.checkRow} ${
                                  doc.summaryPdf ? styles.checkReceived : styles.checkMissing
                                }`}
                              >
                                <span className={styles.checkIcon}>
                                  {doc.summaryPdf ? <FaCheck size={11} /> : <FaClock size={11} />}
                                </span>
                                <span className={styles.checkSource}>Summary PDF</span>
                                <span className={styles.checkLabel}>
                                  {distributed && doc.summaryPdf ? (
                                    'Distributed'
                                  ) : (
                                    <span style={{ color: doc.summaryPdf ? '#22c55e' : '#f59e0b' }}>
                                      {doc.summaryPdf ? '✓ received' : 'missing'}
                                    </span>
                                  )}
                                </span>
                              </li>
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {confirm && (
        <div className={styles.confirmOverlay} onClick={() => setConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>
              Distribute {fmtMoney(writer.pending)} to {writer.name}?
            </div>
            <div className={styles.confirmBody}>
              {writer.pendingLines.toLocaleString()} statement lines will be released to {writer.name}'s portal. They
              will see the breakdown immediately and the statement PDF will be generated.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button className={styles.distributeCta} onClick={handleDistribute}>
                <FaPaperPlane size={11} /> Distribute
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminWriterDetail;
