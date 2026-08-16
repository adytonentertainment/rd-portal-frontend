import { FaTimes, FaEye } from 'react-icons/fa';
import { useIsAdmin } from '../../utils/auth';
import { getWriterPersonaId } from '../../utils/persona';
import { MOCK_WRITERS } from '../../mocks/roster';
import styles from './personaBanner.module.css';

// Floating chip that only renders when a writer persona is active (admin preview mode).
// Clicking the X returns the user to the admin dashboard.
const PersonaBanner = () => {
  const isAdmin = useIsAdmin();
  const personaId = getWriterPersonaId();
  if (isAdmin || personaId == null) return null;
  const writer = MOCK_WRITERS.find((w) => w.id === personaId);
  return (
    <div className={styles.banner} title="Demo preview mode">
      <FaEye size={11} />
      <span>
        Previewing as <strong>{writer?.name || 'writer'}</strong>
      </span>
      <a className={styles.exit} href="/persona/admin">
        <FaTimes size={11} /> Exit
      </a>
    </div>
  );
};

export default PersonaBanner;
