import { Helmet } from 'react-helmet-async';
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FaCheck, FaClock, FaUserShield, FaSyncAlt, FaBan } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { listAdmins, approveAdmin, revokeAdmin } from '../../api/accounts';
import { brand } from '../../config/brand';
import styles from './adminAccounts.module.css';

// Admin approval queue. Self-registered admins land pending (backend refuses
// every admin route for them) until someone here approves them.
const AdminAccounts = () => {
  const isAdmin = useIsAdmin();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await listAdmins(false);
      setAdmins(data.admins || []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, fn) => {
    setBusyId(id);
    setError(null);
    try {
      await fn(id);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) return <Navigate to="/earnings" replace />;

  const pending = admins.filter((a) => !a.effective);
  const active = admins.filter((a) => a.effective);

  return (
    <>
      <Helmet>
        <title>Admin accounts | {brand.publisherShort}</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Admin accounts</h1>
              <p className={styles.sub}>
                Admin accounts stay locked out until approved here. {pending.length} awaiting approval · {active.length}{' '}
                active.
              </p>
            </div>
            <button className={styles.refresh} onClick={load} type="button">
              <FaSyncAlt size={11} /> Refresh
            </button>
          </div>

          {error && <div className={styles.error}>{error.message || 'Could not load admin accounts.'}</div>}
          {loading && <div className={styles.muted}>Loading…</div>}

          {!loading && pending.length > 0 && (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <FaClock size={12} /> Awaiting approval
              </div>
              {pending.map((a) => (
                <div key={a.id} className={styles.row}>
                  <div className={styles.who}>
                    <span className={styles.email} title={a.email}>
                      {a.email}
                    </span>
                    <span className={styles.username}>@{a.username}</span>
                  </div>
                  <span className={`${styles.pill} ${styles.pillPending}`}>
                    <FaClock size={9} /> Pending
                  </span>
                  <button
                    className={styles.approve}
                    onClick={() => act(a.id, approveAdmin)}
                    disabled={busyId === a.id}
                    type="button"
                  >
                    <FaCheck size={10} /> {busyId === a.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              ))}
            </section>
          )}

          {!loading && (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <FaUserShield size={12} /> Active admins
              </div>
              {active.length === 0 && <div className={styles.muted}>No active admins.</div>}
              {active.map((a) => (
                <div key={a.id} className={styles.row}>
                  <div className={styles.who}>
                    <span className={styles.email} title={a.email}>
                      {a.email}
                    </span>
                    <span className={styles.username}>@{a.username}</span>
                  </div>
                  <span className={`${styles.pill} ${styles.pillActive}`}>
                    <FaCheck size={9} /> Active
                  </span>
                  <button
                    className={styles.revoke}
                    onClick={() => act(a.id, revokeAdmin)}
                    disabled={busyId === a.id}
                    title="Revoke admin access (keeps the account)"
                    type="button"
                  >
                    <FaBan size={10} /> {busyId === a.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminAccounts;
