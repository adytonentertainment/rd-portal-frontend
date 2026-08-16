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
import { FaArrowLeft, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import { useGoogleLogin } from '@react-oauth/google';
import { brand } from '../../config/brand';
import { statementsLive } from '../../config/featureFlags';

// Where to land after login when no explicit ?redirect is given. In live mode
// send them through the root router, which routes admin→/admin and
// writer→/statements by their real account; the demo build keeps /earnings.
const defaultLanding = () => (statementsLive ? '/' : '/earnings');

// Validate redirect URL to prevent open redirect attacks
const getSafeRedirectUrl = (url) => {
  if (!url) return defaultLanding();
  const decoded = decodeURIComponent(url);
  if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.toLowerCase().startsWith('/\\')) {
    return decoded;
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
      const response = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/token'),
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: formDetails,
      });
      localStorage.setItem('token', response.data.access_token);
      window.location.href = redirectURL;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) setErrorMessage('Invalid credentials. Please try again.');
        else if (error.response.status === 429)
          setErrorMessage(error.response.data?.detail || 'Too many login attempts. Please try again later.');
        else setErrorMessage(error.response.data?.detail || 'Something went wrong. Please try again.');
      } else if (error.request) {
        setErrorMessage('Unable to connect to server. Please check your internet connection.');
      } else {
        setErrorMessage('An error occurred. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Google OAuth login
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoginLoading(true);
      setErrorMessage('');
      try {
        const res = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `/auth/google-login/${tokenResponse.access_token}`),
          { method: 'POST' }
        );
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.access_token);
          window.location.href = redirectURL;
        } else {
          setErrorMessage(data.detail || 'Google login failed');
        }
      } catch (err) {
        console.error('Google login error:', err);
        setErrorMessage('Google login failed. Please try again.');
      } finally {
        setLoginLoading(false);
      }
    },
  });

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
        <VeraxLogo iconOnly width={70} className="mb-3 flex-shrink-0" style={{ maxWidth: '70px', opacity: 1 }} />

        {!showEmailForm ? (
          /* ─── Gateway view ─── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
            <h2 className={styles.loginHeading} style={{ fontSize: '20px', marginBottom: '4px', fontWeight: 700 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--soft-text)', marginBottom: '20px' }}>{brand.signInHeadline}</p>

            {/* Sign in with Google */}
            <button
              onClick={() => googleLogin()}
              disabled={loginLoading}
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '12px 16px',
                borderRadius: '40px',
                border: 'none',
                background: '#fff',
                color: '#1a1a1a',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'opacity 150ms ease',
                opacity: loginLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = loginLoading ? '0.6' : '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = loginLoading ? '0.6' : '1')}
            >
              {loginLoading ? (
                <CircularProgress size={18} style={{ color: '#1a1a1a' }} />
              ) : (
                <>
                  <FaGoogle size={18} style={{ color: '#4285F4' }} />
                  Sign in with Google
                </>
              )}
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                maxWidth: '300px',
                margin: '10px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '13px', color: 'var(--muted-text)' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

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
              Sign in with Email
            </button>

            {/* Links */}
            <div
              style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontSize: '13px', color: 'var(--muted-text)' }}>
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--font)',
                    padding: 0,
                  }}
                >
                  Create account
                </button>
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
                Go back
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
              Sign in with Email
            </h2>

            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Input
                ref={usernameRef}
                type="text"
                label="Username"
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
                label="Password"
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

              <div className="flex justify-between items-center" style={{ marginTop: '4px' }}>
                <button className={styles.linkButton} onClick={() => navigate('/forgotPassword')}>
                  Forgot password?
                </button>
                <button className={styles.linkButton} onClick={() => navigate('/register')}>
                  Create account
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                <FlatButton
                  onClick={() => handleLogin(usernameRef.current.value, passwordRef.current.value)}
                  disabled={loginLoading}
                  style={{ width: '100%', maxWidth: '300px', opacity: loginLoading ? 0.6 : 1 }}
                >
                  {loginLoading ? <CircularProgress size={18} style={{ color: '#1a1a1a' }} /> : 'Sign in'}
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
                <span>Back</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;
