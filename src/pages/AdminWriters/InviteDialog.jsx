import { useEffect, useState } from 'react';
import { FaTimes, FaCheck, FaCopy, FaTrash, FaPaperPlane, FaExclamationTriangle } from 'react-icons/fa';
import { adminInviteToWriter, adminListWriterInvites, adminResendInvite } from '../../api/portal';
import { revokeInvite, getWriter } from '../../api/writersAdmin';
import styles from './adminWriters.module.css';

const ROLES = [
  { value: 'primary', label: 'Primary' },
  { value: 'manager', label: 'Manager' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

const inviteLink = (token) => `${window.location.origin}/invite/${token}`;

// What the admin needs to know is whether the writer actually got the email.
const deliveryLabel = (invite) => {
  switch (invite.delivery_status) {
    case 'sent':
      return 'Emailed';
    case 'failed':
      return 'Email failed';
    case 'not_sent':
      return 'Link only';
    default:
      return 'Sending…';
  }
};

// Invite a client to their portal. The backend emails the link; the copyable
// link stays because email bounces, lands in spam, or goes to a dead address,
// and the admin needs a way to hand it over anyway. `writer` is
// { id, canonical_name, primary_email }.
const InviteDialog = ({ writer, onClose, onChanged }) => {
  const [email, setEmail] = useState(writer?.primary_email || '');
  const [role, setRole] = useState('primary');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [resending, setResending] = useState(null);
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  // Everyone the client list put on this account, not just the first address.
  const [contacts, setContacts] = useState([]);

  const loadInvites = async () => {
    try {
      const list = await adminListWriterInvites(writer.id);
      setInvites(list || []);
    } catch {
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    loadInvites();
    // A row can name several people — a manager, an attorney — in one cell, so
    // the account's contacts are the natural thing to invite. Typing the
    // address by hand was the only route, which meant the extra contacts were
    // invisible here even though the import had already recorded them.
    getWriter(writer.id)
      .then((w) => setContacts(w?.contacts || []))
      .catch(() => setContacts([]));
  }, [writer.id]); // eslint-disable-line

  const handleSend = async () => {
    if (sending) return;
    if (!email.trim()) {
      setError('Enter an email address.');
      return;
    }
    setSending(true);
    setError(null);
    setFresh(null);
    try {
      const res = await adminInviteToWriter(writer.id, email.trim(), role);
      setFresh(res);
      await loadInvites();
      // Delivery resolves in a background task, so the status the create call
      // returned is always 'pending' — re-read it shortly after.
      setTimeout(loadInvites, 2500);
      onChanged?.();
    } catch (err) {
      if (err?.status === 409) {
        setError(err.message || 'That email already has access to this client.');
      } else {
        setError(err?.message || 'Could not send invite.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fresh.invite_url || inviteLink(fresh.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy — select and copy the link manually.');
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      await revokeInvite(writer.id, inviteId);
      await loadInvites();
      onChanged?.();
    } catch (err) {
      setError(err?.message || 'Could not revoke invite.');
    }
  };

  const handleResend = async (inviteId) => {
    setResending(inviteId);
    setError(null);
    try {
      const res = await adminResendInvite(writer.id, inviteId);
      setFresh(res);
      await loadInvites();
      setTimeout(loadInvites, 2500);
    } catch (err) {
      setError(err?.message || 'Could not resend invite.');
    } finally {
      setResending(null);
    }
  };

  const sameAddress = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

  // What this person's portal access currently is. has_login means they have
  // claimed THIS client, not merely that the address has a login somewhere.
  const contactState = (c) => {
    if (c.has_login) return { label: 'Has access', tone: 'ok' };
    const inv = invites.find((i) => sameAddress(i.email, c.email));
    if (inv?.accepted) return { label: 'Has access', tone: 'ok' };
    if (inv?.active) return { label: 'Invited, not accepted', tone: 'pending' };
    return { label: 'Not invited', tone: 'none' };
  };

  const pending = invites.filter((i) => i.active && !i.accepted);
  const accepted = invites.filter((i) => i.accepted);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.inviteModal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>Invite to portal</h2>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={styles.formBody}>
          <div className={styles.mutedNote}>
            Grant <strong>{writer.canonical_name}</strong> access to their writer portal.
          </div>

          {contacts.length > 0 && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Contacts on this account ({contacts.length})</span>
              <ul className={styles.contactPick}>
                {contacts.map((c) => {
                  const st = contactState(c);
                  const chosen = sameAddress(c.email, email);
                  return (
                    <li key={c.contact_id}>
                      <button
                        type="button"
                        className={`${styles.contactPickRow} ${chosen ? styles.contactPickOn : ''}`}
                        onClick={() => {
                          setEmail(c.email);
                          setRole(c.role || 'primary');
                          setError(null);
                        }}
                      >
                        <span className={styles.contactPickWho}>
                          <strong>{c.display_name || c.email}</strong>
                          {c.display_name && <span className={styles.contactPickMail}>{c.email}</span>}
                        </span>
                        <span className={styles.contactPickMeta}>
                          <span className={styles.contactPickRole}>{c.role}</span>
                          <span className={styles[`tone_${st.tone}`]}>{st.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <span className={styles.mutedNote}>Pick one to invite, or type any other address below.</span>
            </div>
          )}

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              type="email"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Role</span>
            <select className={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {fresh && (
            <div className={styles.linkBox}>
              <span className={styles.fieldLabel}>Emailed to {fresh.email} — or send this link yourself</span>
              <div className={styles.linkRow}>
                <input className={styles.input} readOnly value={fresh.invite_url || inviteLink(fresh.token)} />
                <button className={styles.copyBtn} onClick={handleCopy}>
                  {copied ? <FaCheck /> : <FaCopy />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Current invites</span>
            {loadingInvites ? (
              <div className={styles.mutedNote}>Loading…</div>
            ) : invites.length === 0 ? (
              <div className={styles.mutedNote}>No invites yet.</div>
            ) : (
              <ul className={styles.contactList}>
                {accepted.map((i) => (
                  <li key={i.id} className={styles.contactRow}>
                    <span className={styles.contactEmail}>
                      {i.email}
                      <span className={`${styles.pill} ${styles.pillActive}`}>Portal active</span>
                    </span>
                  </li>
                ))}
                {pending.map((i) => (
                  <li key={i.id} className={styles.contactRow}>
                    <span className={styles.contactEmail}>
                      {i.email}
                      <span className={`${styles.pill} ${styles.pillInvited}`}>{deliveryLabel(i)}</span>
                      {i.delivery_status === 'failed' && (
                        <span className={styles.deliveryError} title={i.delivery_error}>
                          <FaExclamationTriangle size={10} /> Email did not go out — send the link yourself
                        </span>
                      )}
                    </span>
                    <span className={styles.rowActions}>
                      <button
                        className={styles.linkAction}
                        onClick={() => handleResend(i.id)}
                        disabled={resending === i.id}
                      >
                        <FaPaperPlane size={11} /> {resending === i.id ? 'Sending…' : 'Resend'}
                      </button>
                      <button className={styles.linkDanger} onClick={() => handleRevoke(i.id)}>
                        <FaTrash size={11} /> Revoke
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className={styles.formFooter}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            Close
          </button>
          <button className={styles.primaryBtn} onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default InviteDialog;
