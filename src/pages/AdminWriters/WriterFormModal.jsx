import { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { createWriter, updateWriter, unlinkContact, addContact } from '../../api/writersAdmin';
import styles from './adminWriters.module.css';

const CATALOGS = ['MECH', 'YT', 'PERF'];
const KINDS = [
  { value: '', label: '—' },
  { value: 'client', label: 'Client' },
  { value: 'commission_partner', label: 'Commission partner' },
];
const LANGS = [
  { value: '', label: '—' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];
const CADENCES = [
  { value: '', label: '—' },
  { value: 'semiannual', label: 'Semiannual' },
  { value: 'quarterly', label: 'Quarterly' },
];
const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'offboarded', label: 'Offboarded' },
];

// Create/edit a writer's client-list-schema fields. `writer` is the detail
// object from getWriter (edit) or null (create). On save, calls the live API
// and hands the fresh detail back via onSaved. Contact-email + beneficiary
// account panels are edit-only (a not-yet-created writer has neither).
const WriterFormModal = ({ writer, onClose, onSaved }) => {
  const isEdit = !!writer;
  const [form, setForm] = useState({
    canonical_name: writer?.canonical_name || '',
    payee_name: writer?.payee_name || '',
    kind: writer?.kind || '',
    expected_catalogs: writer?.expected_catalogs || [],
    preferred_language: writer?.preferred_language || '',
    cadence: writer?.cadence || '',
    status: writer?.status || 'active',
  });
  const [contacts, setContacts] = useState(writer?.contacts || []);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setContacts(writer?.contacts || []);
  }, [writer]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const toggleCatalog = (c) =>
    setForm((prev) => ({
      ...prev,
      expected_catalogs: prev.expected_catalogs.includes(c)
        ? prev.expected_catalogs.filter((x) => x !== c)
        : [...prev.expected_catalogs, c],
    }));

  const handleSave = async () => {
    if (saving) return;
    if (!form.canonical_name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      canonical_name: form.canonical_name.trim(),
      payee_name: form.payee_name.trim() || null,
      kind: form.kind || null,
      expected_catalogs: form.expected_catalogs,
      preferred_language: form.preferred_language || null,
      cadence: form.cadence || null,
    };
    try {
      // Flush a contact email typed into the add-row but not yet "Add"-ed, so
      // "Save changes" persists it too — users expect Save to save everything
      // on the form, not just the fields, and often skip the separate Add click.
      const pendingEmail = newEmail.trim();
      if (isEdit && pendingEmail) {
        if (!pendingEmail.includes('@')) {
          setError('Enter a valid contact email.');
          return; // finally resets `saving`
        }
        const updated = await addContact(writer.id, {
          email: pendingEmail,
          displayName: newName.trim() || undefined,
        });
        setContacts(updated.contacts || []);
        setNewEmail('');
        setNewName('');
      }
      const saved = isEdit
        ? await updateWriter(writer.id, { ...payload, status: form.status })
        : await createWriter(payload);
      onSaved?.(saved);
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (contactId) => {
    try {
      await unlinkContact(writer.id, contactId);
      setContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
    } catch (err) {
      setError(err?.message || 'Could not remove contact.');
    }
  };

  const handleAddContact = async () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) {
      setError('Enter a valid contact email.');
      return;
    }
    setAddingContact(true);
    setError(null);
    try {
      const updated = await addContact(writer.id, { email, displayName: newName.trim() || undefined });
      setContacts(updated.contacts || []);
      setNewEmail('');
      setNewName('');
    } catch (err) {
      setError(err?.message || 'Could not add contact.');
    } finally {
      setAddingContact(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>{isEdit ? 'Edit client' : 'Add client'}</h2>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className={styles.formBody}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name *</span>
            <input
              className={styles.input}
              value={form.canonical_name}
              onChange={(e) => set('canonical_name', e.target.value)}
              placeholder="Canonical name"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Payee name</span>
            <input
              className={styles.input}
              value={form.payee_name}
              onChange={(e) => set('payee_name', e.target.value)}
              placeholder="Name royalties are paid under"
            />
          </label>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Kind</span>
              <select className={styles.input} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Language</span>
              <select
                className={styles.input}
                value={form.preferred_language}
                onChange={(e) => set('preferred_language', e.target.value)}
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Cadence</span>
              <select className={styles.input} value={form.cadence} onChange={(e) => set('cadence', e.target.value)}>
                {CADENCES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {isEdit && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Status</span>
                <select className={styles.input} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Catalogs</span>
            <div className={styles.chipRow}>
              {CATALOGS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`${styles.chip} ${form.expected_catalogs.includes(c) ? styles.chipActive : ''}`}
                  onClick={() => toggleCatalog(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {isEdit && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Contact emails</span>
              {contacts.length > 0 && (
                <ul className={styles.contactList}>
                  {contacts.map((c) => (
                    <li key={c.contact_id} className={styles.contactRow}>
                      <span className={styles.contactEmail}>
                        {c.display_name ? `${c.display_name} · ` : ''}
                        {c.email}
                        <span className={styles.contactRole}>{c.role}</span>
                        {c.has_login && <span className={styles.contactLogin}>portal</span>}
                      </span>
                      <button className={styles.linkDanger} onClick={() => handleUnlink(c.contact_id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.fieldRow} style={{ marginTop: contacts.length ? 8 : 0 }}>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="contact@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                />
                <input
                  className={styles.input}
                  placeholder="Name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                  style={{ maxWidth: 160 }}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleAddContact}
                  disabled={addingContact || !newEmail.trim()}
                >
                  {addingContact ? 'Adding…' : 'Add'}
                </button>
              </div>
              <div className={styles.mutedNote}>
                Records the contact email. “Invite to portal” also sends them a login.
              </div>
            </div>
          )}

          {isEdit && writer.accounts?.length > 0 && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Beneficiary accounts (read-only)</span>
              <div className={styles.accountsBox}>
                {writer.accounts.map((a) => (
                  <div key={a.id} className={styles.accountRow}>
                    <code>{a.account_code}</code>
                    <span>{a.catalog || '—'}</span>
                    <span className={styles.accountStatus}>{a.status}</span>
                  </div>
                ))}
              </div>
              <div className={styles.mutedNote}>
                Re-point an account to a different client in the client-import resolution queue.
              </div>
            </div>
          )}

          {error && <div className={styles.formError}>{error}</div>}
        </div>

        <footer className={styles.formFooter}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create client'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default WriterFormModal;
