import { useEffect, useState } from 'react';
import { FaUserPlus, FaTrash, FaCopy, FaCheck } from 'react-icons/fa';
import { listWriterMembers, shareWriterAccess, revokeMyInvite } from '../../api/portal';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './writerStatements.module.css';

const ROLES = ['manager', 'legal', 'other'];

// Who else can see this catalog, and — for the primary contact only — a way to
// add someone.
//
// The invite form is hidden for guests because the server refuses them anyway
// (403 from /me/writers/{id}/invites): a manager or attorney reads everything
// but must not be able to widen access to someone else's royalties. The list
// itself stays visible to everyone, so a guest can see who they are sharing
// the room with rather than wondering.
const AccessPanel = ({ writer }) => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('manager');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [copied, setCopied] = useState(false);

  const canManage = writer?.can_manage_access;

  const load = async () => {
    try {
      setData(await listWriterMembers(writer.id));
    } catch {
      setData({ members: [], pending_invites: [] });
    }
  };

  useEffect(() => {
    if (writer?.id) load();
  }, [writer?.id]); // eslint-disable-line

  const handleInvite = async () => {
    if (sending || !email.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await shareWriterAccess(writer.id, email.trim(), role);
      setFresh(res);
      setEmail('');
      await load();
    } catch (err) {
      setError(err?.message || t('access.inviteFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (inviteId) => {
    setError(null);
    try {
      await revokeMyInvite(inviteId);
      await load();
    } catch (err) {
      setError(err?.message || t('access.revokeFailed'));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fresh.invite_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the link is on screen and selectable anyway */
    }
  };

  if (!data) return null;
  const members = data.members || [];
  const pending = data.pending_invites || [];

  return (
    <div className={styles.accessCard}>
      <div className={styles.accessHeader}>
        <h2 className={styles.accessTitle}>{t('access.title')}</h2>
        <p className={styles.accessSubtitle}>{canManage ? t('access.subtitle') : t('access.guestNote')}</p>
      </div>

      {members.length === 0 && pending.length === 0 ? (
        <div className={styles.accessEmpty}>{t('access.empty')}</div>
      ) : (
        <ul className={styles.accessList}>
          {members.map((m) => (
            <li key={`m-${m.email}`} className={styles.accessRow}>
              <span className={styles.accessEmail}>{m.display_name || m.email}</span>
              <span className={styles.accessMeta}>
                {t(`access.role.${m.role}`)} · {t('access.statusActive')}
              </span>
            </li>
          ))}
          {pending.map((p) => (
            <li key={`p-${p.id}`} className={styles.accessRow}>
              <span className={styles.accessEmail}>{p.email}</span>
              <span className={styles.accessMeta}>
                {t(`access.role.${p.role}`)} · {t('access.statusInvited')}
              </span>
              {canManage && (
                <button className={styles.accessRevoke} onClick={() => handleRevoke(p.id)}>
                  <FaTrash size={10} /> {t('access.revoke')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className={styles.accessForm}>
          <input
            className={styles.accessInput}
            type="email"
            value={email}
            placeholder={t('access.emailPlaceholder')}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className={styles.accessInput}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label={t('access.role')}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`access.role.${r}`)}
              </option>
            ))}
          </select>
          <button className={styles.accessSend} onClick={handleInvite} disabled={sending}>
            <FaUserPlus size={11} /> {sending ? t('access.sending') : t('access.send')}
          </button>
        </div>
      )}

      {error && <div className={styles.accessError}>{error}</div>}

      {fresh && (
        // Email bounces and lands in spam, so the link stays copyable.
        <div className={styles.accessLinkBox}>
          <span className={styles.accessMeta}>{t('access.linkNote', { email: fresh.email })}</span>
          <div className={styles.accessLinkRow}>
            <input className={styles.accessInput} readOnly value={fresh.invite_url} />
            <button className={styles.accessSend} onClick={handleCopy}>
              {copied ? <FaCheck size={11} /> : <FaCopy size={11} />} {copied ? t('access.copied') : t('access.copy')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessPanel;
