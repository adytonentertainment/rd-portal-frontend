import { Helmet } from 'react-helmet-async';
import { useRef, useEffect, useState, useContext } from 'react';
// import { useGoogleLogin } from '@react-oauth/google'; // Temporarily disabled
import urlJoin from 'url-join';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
// import GoogleAuthButton from '../../components/Buttons/AuthButtons/GoogleAuthButton'; // Temporarily disabled
import { Card, CardHeader, CardBody, Input } from '@heroui/react';
import { CircularProgress } from '@mui/material';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import styles from './signup.module.css';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { FaArrowLeft } from 'react-icons/fa6';
import { validatePassword } from '../../utils/passwordValidator';

const SignUp = () => {
  // Google login temporarily disabled
  // const googleSignup = useGoogleLogin({
  //   onSuccess: (tokenResponse) => {
  //     handleGoogleSignup(tokenResponse.access_token);
  //   },
  // });
  const emailRef = useRef();
  const usernameRef = useRef();
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();
  const recaptchaRef = useRef();

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const theme = useContext(ThemeContext);

  const handleSignup = async (event) => {
    event?.preventDefault();
    if (isLoading) return;

    // Validate password confirmation
    if (passwordRef.current.value !== confirmPasswordRef.current.value) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // Validate password strength
    const validation = validatePassword(passwordRef.current.value);
    if (!validation.isValid) {
      setErrorMessage('Password does not meet requirements: ' + validation.errors.join(', '));
      return;
    }

    setIsLoading(true);
    setErrorMessage(''); // Clear any previous errors

    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/user'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          username: usernameRef.current.value,
          email: emailRef.current.value,
          password: passwordRef.current.value,
          captchaToken: await recaptchaRef.current.executeAsync(),
        }),
      });
      const data = await response.json();

      if (response.ok) {
        handleLogin();
      } else {
        setErrorMessage(data.detail);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error.detail || 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async (token) => {
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `/auth/create-google-user/${token}`), {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        handleGoogleLogin(token);
      } else {
        setErrorMessage(data.detail);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error.detail);
    }
  };

  const handleLogin = async () => {
    const formDetails = new URLSearchParams();
    formDetails.append('username', usernameRef.current.value);
    formDetails.append('password', passwordRef.current.value);
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/token'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDetails,
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        // do not use navigate, whole page refresh is needed
        window.location.href = '/signup-successful';
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGoogleLogin = async (token) => {
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `/auth/google-login/${token}`), {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        navigate('/');
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const listener = (event) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        handleSignup(null);
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Sign Up | RD</title>
      </Helmet>
      <div
        className={`${styles.wizardScope} flex items-center justify-center w-screen min-h-screen flex-col`}
        style={{
          position: 'relative',
          padding: '16px 16px 10vh',
          background: 'var(--background)',
        }}
      >
        <VeraxLogo width={30} className="mb-3" />
        <Card
          className="w-full max-w-sm p-2"
          shadow="none"
          style={{
            background: 'transparent',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
          }}
        >
          <CardHeader className="flex flex-col gap-1 pb-2">
            <h1 className={styles.stepHeading} style={{ marginBottom: 0 }}>
              Create Account
            </h1>
          </CardHeader>
          <CardBody className="gap-2">
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
              <Input
                ref={usernameRef}
                type="text"
                label="Username"
                variant="bordered"
                size="sm"
                autoComplete="username"
                classNames={{
                  input: 'text-sm',
                  label: 'text-xs font-medium',
                }}
              />

              <Input
                ref={emailRef}
                type="email"
                label="Email"
                variant="bordered"
                size="sm"
                autoComplete="email"
                classNames={{
                  input: 'text-sm',
                  label: 'text-xs font-medium',
                }}
              />

              <Input
                ref={passwordRef}
                type="password"
                label="Password"
                variant="bordered"
                size="sm"
                autoComplete="new-password"
                classNames={{
                  input: 'text-sm',
                  label: 'text-xs font-medium',
                }}
              />

              <Input
                ref={confirmPasswordRef}
                type="password"
                label="Confirm Password"
                variant="bordered"
                size="sm"
                autoComplete="new-password"
                classNames={{
                  input: 'text-sm',
                  label: 'text-xs font-medium',
                }}
              />

              <input className={styles.hp} type="text" id="hp" name="hp" tabIndex="-1" />

              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--soft-text)', fontSize: '11px' }}>Already have an account?</span>
                <button onClick={() => navigate('/login')} className={styles.linkButton}>
                  Sign in
                </button>
              </div>

              <FlatButton
                onClick={handleSignup}
                className="mx-auto mt-1"
                style={{
                  width: '100%',
                  maxWidth: '260px',
                }}
              >
                {isLoading ? <CircularProgress size={18} style={{ color: '#1a1a1a' }} /> : 'Create account'}
              </FlatButton>

              {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

              <p className="text-center" style={{ color: 'var(--soft-text)', fontSize: '9px', marginTop: '4px' }}>
                By signing up, you agree to our{' '}
                <button onClick={() => navigate('/tos')} className={styles.linkButton} style={{ fontSize: '9px' }}>
                  Terms of Service
                </button>{' '}
                and{' '}
                <button onClick={() => navigate('/pp')} className={styles.linkButton} style={{ fontSize: '9px' }}>
                  Privacy Policy
                </button>
                .
              </p>
            </form>
          </CardBody>
        </Card>
        <button
          className="mt-3"
          onClick={() => navigate('/')}
          type="button"
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
          <span>Go Back</span>
        </button>
      </div>
      <ReCAPTCHA ref={recaptchaRef} sitekey="6LflXwwrAAAAAJunzDZUUNsXHOU8-IeQ3nFujKeF" size="invisible" />
    </>
  );
};

export default SignUp;
