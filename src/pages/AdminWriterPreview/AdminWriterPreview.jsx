import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaEye, FaExclamationTriangle } from 'react-icons/fa';
import Revenue from '../Revenue/Revenue';
import { getWriter } from '../../api/writersAdmin';
import styles from './adminWriterPreview.module.css';

// READ-ONLY preview of one client's portal, opened from the admin panel.
//
// This renders the WRITER'S OWN PAGE — <Revenue />, the same component, the
// same visuals, the same aggregation — with its data fetched through
// /admin/writers/{id}/portal-view instead of /me/*, because an admin has no
// portal contact record and /me/* would (correctly) refuse them.
//
// The first version of this was a separate summary page that reimplemented the
// panels. It was wrong in the way lookalikes are always wrong: it already
// disagreed with the portal (it listed the same song twice, because it did not
// group song rows by title the way the real page does), and every future change
// to the portal would have widened the gap. An admin asking "what is my client
// seeing?" has to be looking at the thing the client sees.
//
// It is deliberately NOT impersonation: no client session is minted, and the
// endpoint behind it has no write counterpart.

const AdminWriterPreview = () => {
  const { id } = useParams();
  const [writer, setWriter] = useState(null);
  const [error, setError] = useState(null);

  // Only the identity, for the banner — the page's money comes from the
  // portal-view endpoint via <Revenue portalPreviewWriterId>.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = await getWriter(id);
        if (!cancelled) setWriter(w);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load this client');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorBox}>
          <FaExclamationTriangle /> {error}
        </div>
      </div>
    );
  }

  const name = writer?.canonical_name || '…';
  const payee = writer?.payee_name && writer.payee_name !== name ? ` (${writer.payee_name})` : '';

  return (
    <div className={styles.wrap}>
      {/* Fixed, not sticky, and never dismissible. An admin who scrolls deep
          into someone else's royalties must still be able to see whose they
          are — misreading this page as your own account is how a bug, or a
          payout decision, gets filed against the wrong client. The page below
          is padded down so the banner never covers its header. */}
      <div className={styles.banner} role="status">
        <FaEye />
        <span>
          Previewing <strong>{name}</strong>
          {payee} — read-only. You are signed in as an admin; this is not their account.
        </span>
      </div>

      <div className={styles.page}>
        <Revenue portalPreviewWriterId={id} />
      </div>
    </div>
  );
};

export default AdminWriterPreview;
