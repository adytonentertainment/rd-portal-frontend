import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaSpinner } from 'react-icons/fa';
import { getReleaseNotify, notifyRelease, previewReleaseNotify, retryReleaseNotify } from '../../api/statementsAdmin';
import dialog from '../AdminOverview/adminOverview.module.css';

const n = (v) => Number(v || 0).toLocaleString('en-US');
const plural = (count, one, many) => (count === 1 ? one : many);

// "Notify writers" for the newest release (e.g. H1 2026 + Q2 2026): shows who
// would be emailed, lets the admin send themselves a preview, then sends and
// reports progress. Once per writer and once per person per release; each
// email is in the reader's language and carries no amounts.
const NotifyWritersDialog = ({ onClose: close, onChanged }) => {
  // Closing refreshes the table: a send may still be finishing in the background.
  const onClose = () => {
    if (onChanged) onChanged();
    close();
  };
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await getReleaseNotify();
      setInfo(data);
      return data;
    } catch (err) {
      setError(err?.message || 'Could not load notification details.');
      return null;
    }
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(pollRef.current);
  }, [load]);

  // While a run is in progress, refresh every 2s until it finishes.
  const poll = useCallback(async () => {
    const data = await load();
    if (data && data.sending) {
      pollRef.current = setTimeout(poll, 2000);
    } else if (onChanged) {
      onChanged();
    }
  }, [load, onChanged]);

  const run = async (action, successMessage) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await action();
      if (data && data.periods) setInfo(data);
      if (successMessage) toast.success(successMessage(data));
      await poll();
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const emails = (info && info.emails) || {};
  const problems = (emails.failed || 0) + (emails.not_sent || 0) + (emails.suppressed || 0);

  return (
    <div className={dialog.confirmOverlay} onClick={() => !busy && onClose()}>
      <div className={dialog.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={dialog.confirmTitle}>Notify writers{info && info.label ? ` · ${info.label}` : ''}</div>
        <div className={dialog.confirmBody}>
          {!info && !error && 'Loading…'}
          {error && <div style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>}
          {info && (
            <>
              {info.sending ? (
                <p>
                  <FaSpinner className={dialog.spinner} size={11} /> Sending… {n(emails.sent)} sent so far,{' '}
                  {n(emails.pending)} to go. You can close this; sending continues.
                </p>
              ) : info.recipients > 0 ? (
                <p>
                  This will email <b>{n(info.recipients)}</b> {plural(info.recipients, 'person', 'people')} that new
                  statements are ready for <b>{n(info.writers_to_notify)}</b>{' '}
                  {plural(info.writers_to_notify, 'writer', 'writers')}. One email per person, in their language, with a
                  link to the portal and no amounts. Anyone already notified for this release is skipped.
                </p>
              ) : (
                <p>Everyone who can sign in has already been notified for this release.</p>
              )}
              <ul className={dialog.confirmList}>
                <li>
                  {n(info.writers_notified)} of {n(info.writers_total)} writers already notified
                </li>
                {info.writers_without_login > 0 && (
                  <li>
                    {n(info.writers_without_login)} {plural(info.writers_without_login, 'writer has', 'writers have')}{' '}
                    no portal login yet and {plural(info.writers_without_login, 'is', 'are')} skipped. Their invite is
                    how they&apos;ll find out.
                  </li>
                )}
                {info.last_run_at && (
                  <li>
                    Emails so far: {n(emails.sent)} sent
                    {emails.failed ? ` · ${n(emails.failed)} failed` : ''}
                    {emails.not_sent ? ` · ${n(emails.not_sent)} not sent` : ''}
                    {emails.suppressed ? ` · ${n(emails.suppressed)} held by the email allowlist` : ''}
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
        <div className={dialog.confirmActions} style={{ flexWrap: 'wrap' }}>
          <button className={dialog.cancelBtn} onClick={onClose} disabled={busy}>
            Close
          </button>
          {info && !info.sending && (
            <button
              className={dialog.cancelBtn}
              disabled={busy}
              onClick={() => run(previewReleaseNotify, (d) => `Preview (English and Spanish) sent to ${d.sent_to}`)}
            >
              Send me a preview
            </button>
          )}
          {info && !info.sending && problems > 0 && (
            <button
              className={dialog.cancelBtn}
              disabled={busy}
              onClick={() => run(retryReleaseNotify, (d) => `Retrying ${n(d.queued)} email(s)`)}
            >
              Retry failed
            </button>
          )}
          {info && !info.sending && info.recipients > 0 && (
            <button
              className={dialog.primaryBtn}
              disabled={busy}
              onClick={() => run(notifyRelease, (d) => `Sending ${n(d.queued)} email(s)`)}
            >
              {busy && <FaSpinner className={dialog.spinner} size={11} />}
              Notify {n(info.recipients)} {plural(info.recipients, 'person', 'people')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotifyWritersDialog;
