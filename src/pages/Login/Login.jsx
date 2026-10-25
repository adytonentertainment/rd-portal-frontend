import { Helmet } from 'react-helmet-async';
import { Input } from '@heroui/react';
import styles from './login.module.css';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, useContext } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';
import urlJoin from 'url-join';
import { UserContextProvider } from '../../components/UserContext/UserContext';
import { FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import { brand } from '../../config/brand';
import { statementsLive } from '../../config/featureFlags';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageToggle from '../../components/LanguageToggle/LanguageToggle';

// Where to land after login when no explicit ?redirect is given. In live mode
// send them through the root router, which routes admin→/admin and
// writer→/statements by their real account; the demo build keeps /earnings.
const defaultLanding = () => (statementsLive ? '/' : '/earnings');

// Validate redirect URL to prevent open redirect attacks.
// Only a same-origin path is allowed. Control characters are removed first so
// a tab or newline after the slash cannot be read as a protocol-relative URL.
const getSafeRedirectUrl = (url) => {
  if (!url) return defaultLanding();
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return defaultLanding();
  }
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  const stripped = decoded.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, '');
  if (stripped.startsWith('/') && !stripped.startsWith('//') && !stripped.toLowerCase().startsWith('/\\')) {
    return stripped;
  }
  return defaultLanding();
};

const Login = () => {
  const navigate = useNavigate();
  const usernameRef = useRef();
  const passwordRef = useRef();
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const user = useContext(UserContextProvider);
  const { t } = useLanguage();

  const redirectURL = getSafeRedirectUrl(searchParams.get('redirect'));
  const lastPageURL = searchParams.get('lastpage') ? getSafeRedirectUrl(searchParams.get('lastpage')) : '/';

  const handleLogin = async (username, password) => {
    if (loginLoading) return;
    setLoginLoading(true);
    setErrorMessage('');
    const formDetails = new URLSearchParams();
    formDetails.append('username', username);
    formDetails.append('password', password);

    try {
      await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/token'),
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: formDetails,
      });
      // The API set the session as an HttpOnly cookie; a full load picks it up.
      window.location.href = redirectURL;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) setErrorMessage(t('auth.invalidCredentials'));
        else if (error.response.status === 429) setErrorMessage(t('auth.tooMany'));
        else setErrorMessage(t('auth.somethingWrong'));
      } else if (error.request) {
        setErrorMessage(t('auth.noConnection'));
      } else {
        setErrorMessage(t('auth.somethingWrong'));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (user) navigate(redirectURL);
    const listener = (event) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (showEmailForm) {
          event.preventDefault();
          handleLogin(usernameRef.current.value, passwordRef.current.value);
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [showEmailForm]);

  return (
    <>
      <Helmet>
        <title>RD - Login</title>
      </Helmet>
      <div
        className={`${styles.loginScope} flex items-center justify-center w-screen min-h-screen flex-col`}
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '16px',
          background: 'var(--background)',
        }}
      >
        {/* EN | ES: a writer can switch before signing in (the browser's language is the default). */}
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageToggle />
        </div>
        <VeraxLogo iconOnly width={70} className="mb-3 flex-shrink-0" style={{ maxWidth: '70px', opacity: 1 }} />

        {!showEmailForm ? (
          /* ─── Gateway view ─── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
            <h2 className={styles.loginHeading} style={{ fontSize: '20px', marginBottom: '4px', fontWeight: 700 }}>
              {t('auth.welcomeBack')}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--soft-text)', marginBottom: '20px' }}>
              {t('auth.signInHeadline')}
            </p>

            {/* Continue with Email */}
            <button
              onClick={() => setShowEmailForm(true)}
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '12px 16px',
                borderRadius: '40px',
                border: 'none',
                background: '#333',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#444')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#333')}
            >
              {t('auth.signInWithEmail')}
            </button>

            {/* Links */}
            <div
              style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              {/* The portal is invite-only, so there is no account to
                  create: registration returns 403. Pointing a confused writer
                  at a form that can only fail is worse than telling them how
                  access actually works. */}
              <span style={{ fontSize: '13px', color: 'var(--muted-text)', textAlign: 'center' }}>
                {t('auth.byInvitation', { publisher: brand.publisherName })}
              </span>
              <button
                onClick={() => navigate(lastPageURL)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-text)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'var(--font)',
                  padding: 0,
                }}
              >
                {t('auth.goBack')}
              </button>
            </div>

            {errorMessage && (
              <div className={styles.errorMessage} style={{ marginTop: '16px' }}>
                {errorMessage}
              </div>
            )}
          </div>
        ) : (
          /* ─── Email login form ─── */
          <div style={{ width: '100%', maxWidth: '300px' }}>
            <h2 className={styles.loginHeading} style={{ fontSize: '16px', marginBottom: '12px' }}>
              {t('auth.signInWithEmail')}
            </h2>

            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Input
                ref={usernameRef}
                type="text"
                label={t('auth.username')}
                variant="bordered"
                size="sm"
                autoComplete="username"
                classNames={{
                  input: 'text-base',
                  label: 'text-xs font-medium',
                }}
              />
              <Input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                label={t('auth.password')}
                variant="bordered"
                size="sm"
                autoComplete="current-password"
                classNames={{
                  input: 'text-base',
                  label: 'text-xs font-medium',
                }}
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--soft-text)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                }
              />

              <div className="flex items-center" style={{ marginTop: '4px' }}>
                <button className={styles.linkButton} onClick={() => navigate('/forgotPassword')}>
                  {t('auth.forgot')}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                <FlatButton
                  onClick={() => handleLogin(usernameRef.current.value, passwordRef.current.value)}
                  disabled={loginLoading}
                  style={{ width: '100%', maxWidth: '300px', opacity: loginLoading ? 0.6 : 1 }}
                >
                  {loginLoading ? <CircularProgress size={18} style={{ color: '#1a1a1a' }} /> : t('auth.signIn')}
                </FlatButton>
              </div>

              {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}
            </form>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                onClick={() => {
                  setShowEmailForm(false);
                  setErrorMessage('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'var(--font)',
                  color: 'var(--soft-text)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 12px',
                }}
              >
                <FaArrowLeft size={10} />
                <span>{t('auth.back')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;
