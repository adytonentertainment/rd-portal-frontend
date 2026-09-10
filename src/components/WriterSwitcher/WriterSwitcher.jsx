import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './writerSwitcher.module.css';

const STORAGE_KEY = 'portalActiveWriter';

// Which client the portal is currently showing.
//
// One login holds every client its address has accepted: somebody who is a
// client for their own catalog and a commission partner on someone else's has
// both here, and people with several catalogs have one entry each. The portal
// shows ONE at a time rather than adding them together, because a commission
// statement and a royalty statement are different money and a combined total
// answers no question anybody asks.
//
// The choice sticks across pages and reloads, so moving between Earnings and
// Statements does not silently change whose figures you are reading.
export const useActiveWriter = (writers) => {
  const [activeId, setActiveIdState] = useState(null);

  useEffect(() => {
    if (!writers || writers.length === 0) return;
    let stored = null;
    try {
      stored = Number(localStorage.getItem(STORAGE_KEY)) || null;
    } catch {
      stored = null; // private mode: the choice lasts for this view only
    }
    // A remembered client that this login no longer holds (access revoked, or a
    // different person signed in) must not leave the portal pointed at nothing.
    const valid = writers.some((w) => w.id === stored);
    setActiveIdState(valid ? stored : writers[0].id);
  }, [writers]);

  const setActiveId = useCallback((id) => {
    setActiveIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* private mode */
    }
  }, []);

  return [activeId, setActiveId];
};

// Renders nothing for a single client, which is almost everyone. A switcher
// offering one option is just furniture.
const WriterSwitcher = ({ writers, activeId, onChange, label }) => {
  const { t } = useLanguage();
  if (!writers || writers.length < 2) return null;

  // Name alone is not enough to tell these apart: somebody who is a client AND
  // a commission partner has two entries under the SAME name, and the whole
  // point of switching is knowing which body of money you are looking at.
  const optionLabel = (w) => {
    const role =
      w.kind === 'client' ? t('role.client') : w.kind === 'commission_partner' ? t('role.commissionPartner') : null;
    return role ? `${w.name} — ${role}` : w.name;
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label || t('switcher.viewing')}</span>
      <select
        className={styles.select}
        value={activeId ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label || 'Choose which account to view'}
      >
        {writers.map((w) => (
          <option key={w.id} value={w.id}>
            {optionLabel(w)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WriterSwitcher;
