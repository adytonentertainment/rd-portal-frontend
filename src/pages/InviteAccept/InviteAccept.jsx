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
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageToggle from '../../components/LanguageToggle/LanguageToggle';
import { getPasswordRequirements, validatePassword } from '../../utils/passwordValidator';
import styles from './inviteAccept.module.css';

// Public landing for a portal-invite link (`/invite/:token`). The token IS the
// auth — no login required. Previews what's being shared, lets a first-time
// user set a password, then accepts → stores the session token and drops the
// recipient into their portal. Invalid/expired tokens hit a friendly dead-end,
// never an error trace.
const InviteAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deadEnd, setDeadEnd] = useState(false);

  // Identity is per client: this login reaches THIS client and no other, so
  // the username is what tells two portals apart at the sign-in screen when
  // the same person holds several. Defaulted to the client's name, editable.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await previewInvite(token);
        if (active) {
          setPreview(res);
          setUsername(res.suggested_username || '');
          // Open in the language the invite email was written in, unless this
          // browser already chose one.
          let chosen = null;
          try {
            chosen = window.localStorage.getItem('portalLanguage');
          } catch {
            // no storage
          }
          if (!chosen && res.language && res.language !== lang) setLang(res.language);
        }
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

  // The server explains in English; in Spanish, say the same thing in Spanish.
  const server = (err, key) => (lang === 'en' && err.message ? err.message : t(key));
  const messageFor = (err) => {
    if (!err) return t('auth.somethingWrong');
    // 409 = the username belongs to somebody already. Ask again rather than
    // treating it as a dead end; the rest of what they typed is still good.
    if (err.status === 409) return server(err, 'invite.errTaken');
    if (err.status === 0) return t('invite.errOffline');
    if (err.status === 400) return server(err, 'invite.errInvalid');
    // 401 = the link is fine, but you must prove the account is yours.
    if (err.status === 401) return server(err, 'invite.errPassword');
    if (err.status === 422) return `${t('invite.errWeak')} ${getPasswordRequirements(t)}`;
    return server(err, 'auth.somethingWrong');
  };

  const handleAccept = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    if (preview?.requires_sign_in) {
      setError(t('invite.errGoogle'));
      return;
    }
    if (preview?.needs_password && !password) {
      setError(preview?.has_login ? t('invite.errNeedExisting') : t('invite.errNeedNew'));
      return;
    }
    // A new password is checked here first, in the reader's language.
    if (preview?.needs_password && !preview?.has_login) {
      const check = validatePassword(password, t);
      if (!check.isValid) {
        setError(check.errors.join(' · '));
        return;
      }
    }
    if (!preview?.has_login && !username.trim()) {
      setError(t('invite.errNeedUsername'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await acceptInvite(token, preview?.needs_password ? password : undefined, username.trim());
      // Accepting signs this browser in (HttpOnly session cookie set by the API).
      window.location.href = '/earnings';
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
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
          <LanguageToggle />
        </div>
        <div className={styles.card}>
          <VeraxLogo />

          {loading ? (
            <div className={styles.centered}>
              <CircularProgress size={22} />
            </div>
          ) : deadEnd ? (
            <>
              <h1 className={styles.title}>{t('invite.deadTitle')}</h1>
              <p className={styles.sub}>{t('invite.deadSub')}</p>
              <FlatButton onClick={() => navigate('/login')}>{t('invite.goToSignIn')}</FlatButton>
            </>
          ) : (
            <form className={styles.form} onSubmit={handleAccept}>
              <div className={styles.badge}>
                <FaCheckCircle size={20} />
              </div>
              <h1 className={styles.title}>{t('invite.title')}</h1>
              <p className={styles.sub}>
                {/* The names are bold wherever the translation puts them. */}
                {t('invite.access')
                  .split(/(\{writer\}|\{email\})/)
                  .map((part, i) =>
                    part === '{writer}' ? (
                      <strong key={i}>{preview.writer_name || t('invite.aClient')}</strong>
                    ) : part === '{email}' ? (
                      <strong key={i}>{preview.email}</strong>
                    ) : (
                      part
                    )
                  )}{' '}
                {t('invite.features')}
              </p>

              {/* Only when setting up a login. If this address already has
                  one, this invite adds a client to it and the account keeps the
                  username it already has. */}
              {preview.needs_password && !preview.requires_sign_in && !preview.has_login && (
                <Input
                  label={t('invite.username')}
                  value={username}
                  onValueChange={setUsername}
                  isRequired
                  autoComplete="username"
                  description={t('invite.usernameHint')}
                />
              )}

              {preview.needs_password && !preview.requires_sign_in && (
                <Input
                  label={preview.has_login ? t('invite.yourPassword') : t('invite.setPassword')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onValueChange={setPassword}
                  isRequired
                  autoComplete={preview.has_login ? 'current-password' : 'new-password'}
                  description={preview.has_login ? t('invite.existingHint') : getPasswordRequirements(t)}
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={t('invite.togglePassword')}
                    >
                      {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  }
                />
              )}

              {preview.requires_sign_in && <p className={styles.sub}>{t('invite.googleNote')}</p>}

              {error && <div className={styles.error}>{error}</div>}

              {/* FlatButton renders a <div>, so it can't submit the form via
                  type="submit" — wire the click straight to handleAccept. */}
              <FlatButton onClick={submitting || preview.requires_sign_in ? undefined : handleAccept}>
                {submitting ? <CircularProgress size={16} /> : t('invite.accept')}
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
                  {preview.requires_sign_in ? t('invite.goToSignIn') : t('auth.forgot')}
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
