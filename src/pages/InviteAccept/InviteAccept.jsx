import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '@heroui/react';
import CircularProgress from '@mui/material/CircularProgress';
import { FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import { previewInvite, acceptInvite } from '../../api/portal';
import { brand } from '../../config/brand';
import styles from './inviteAccept.module.css';

// Public landing for a portal-invite link (`/invite/:token`). The token IS the
// auth — no login required. Previews what's being shared, lets a first-time
// user set a password, then accepts → stores the session token and drops the
// recipient into their portal. Invalid/expired tokens hit a friendly dead-end,
// never an error trace.
const InviteAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deadEnd, setDeadEnd] = useState(false);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await previewInvite(token);
        if (active) setPreview(res);
      } catch {
        // 400/404/expired/revoked all land here — a friendly dead-end, not a trace.
        if (active) setDeadEnd(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const messageFor = (err) => {
    if (!err) return 'Something went wrong. Please try again.';
    if (err.status === 0) return 'Cannot reach the server. Please try again in a moment.';
    if (err.status === 400) return err.message || 'This invite link is no longer valid.';
    // 401 = the link is fine, but you must prove the account is yours.
    if (err.status === 401) return err.message || 'Please check your password and try again.';
    if (err.status === 422) {
      const detail = err.detail?.detail;
      if (Array.isArray(detail) && detail.length) return detail[0]?.msg || 'Please check your password.';
      return 'Your password may not meet the requirements.';
    }
    return err.message || 'Something went wrong. Please try again.';
  };

  const handleAccept = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    if (preview?.requires_sign_in) {
      setError('This account signs in with Google. Please sign in first, then reopen this link.');
      return;
    }
    if (preview?.needs_password && !password) {
      setError(
        preview?.has_login
          ? 'Enter your existing password to accept this invite.'
          : 'Please set a password to secure your portal.'
      );
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await acceptInvite(token, preview?.needs_password ? password : undefined);
      if (res.access_token) {
        localStorage.setItem('token', res.access_token);
        window.location.href = '/earnings';
      } else {
        setError('Something went wrong finishing your access. Please try again.');
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Accept invite | {brand.publisherShort}</title>
      </Helmet>
      <div className={styles.shell}>
        <div className={styles.card}>
          <VeraxLogo />

          {loading ? (
            <div className={styles.centered}>
              <CircularProgress size={22} />
            </div>
          ) : deadEnd ? (
            <>
              <h1 className={styles.title}>This invite link is no longer valid</h1>
              <p className={styles.sub}>
                It may have expired, been revoked, or already been used. Ask whoever sent it for a fresh link.
              </p>
              <FlatButton onClick={() => navigate('/login')}>Go to sign in</FlatButton>
            </>
          ) : (
            <form className={styles.form} onSubmit={handleAccept}>
              <div className={styles.badge}>
                <FaCheckCircle size={20} />
              </div>
              <h1 className={styles.title}>You&apos;ve been invited</h1>
              <p className={styles.sub}>
                You&apos;re getting portal access to <strong>{preview.writer_name || 'a client'}</strong> as{' '}
                <strong>{preview.email}</strong>. See statements, earnings, and distribution history.
              </p>

              {preview.needs_password && !preview.requires_sign_in && (
                <Input
                  label={preview.has_login ? 'Your password' : 'Set a password'}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onValueChange={setPassword}
                  isRequired
                  autoComplete={preview.has_login ? 'current-password' : 'new-password'}
                  description={
                    preview.has_login
                      ? 'This email already has an account — confirm your password to accept'
                      : 'This secures your portal login'
                  }
                  endContent={
                    <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password">
                      {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  }
                />
              )}

              {preview.requires_sign_in && (
                <p className={styles.sub}>
                  This email signs in with Google. <strong>Sign in first</strong>, then reopen this invite link to
                  finish.
                </p>
              )}

              {error && <div className={styles.error}>{error}</div>}

              {/* FlatButton renders a <div>, so it can't submit the form via
                  type="submit" — wire the click straight to handleAccept. */}
              <FlatButton onClick={submitting || preview.requires_sign_in ? undefined : handleAccept}>
                {submitting ? <CircularProgress size={16} /> : 'Accept & open my portal'}
              </FlatButton>

              {(preview.has_login || preview.requires_sign_in) && (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => navigate(preview.requires_sign_in ? '/login' : '/forgotPassword')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    marginTop: 8,
                    fontSize: 13,
                  }}
                >
                  {preview.requires_sign_in ? 'Go to sign in' : 'Forgot your password?'}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default InviteAccept;
