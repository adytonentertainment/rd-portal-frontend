import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@heroui/react';
import CircularProgress from '@mui/material/CircularProgress';
import { FaArrowLeft, FaEye, FaEyeSlash, FaUserEdit, FaUserShield, FaClock, FaCheck } from 'react-icons/fa';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import { registerAccount } from '../../api/accounts';
import { brand } from '../../config/brand';
import styles from './register.module.css';

// Create a Verax account. The role picked here is enforced server-side:
//   writer → usable immediately
//   admin  → needs a signup code AND approval by an existing admin, so this
//            page can only ever create a *pending* admin (never a live one),
//            unless the email is on the backend's bootstrap allowlist.
const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('writer');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // set when an admin lands pending approval

  const messageFor = (err) => {
    if (!err) return 'Something went wrong. Please try again.';
    if (err.status === 0) return 'Cannot reach the server. Is the backend running?';
    if (err.status === 409) return err.message || 'That email or username is already taken.';
    if (err.status === 403) return err.message || 'That admin signup code is not valid.';
    if (err.status === 422) {
      // pydantic validation (weak password / short username)
      const detail = err.detail?.detail;
      if (Array.isArray(detail) && detail.length) return detail[0]?.msg || 'Please check the form.';
      return 'Please check the form — the password may not meet the requirements.';
    }
    if (err.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return err.message || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const account = await registerAccount({ email, username, password, role, adminCode });
      if (account.access_token) localStorage.setItem('token', account.access_token);
      if (account.pending_admin_approval) {
        // Admin created but not yet approved — don't drop them into a dashboard
        // they can't use; show them exactly where they stand.
        setPending(account);
        return;
      }
      window.location.href = account.is_admin ? '/admin' : '/earnings';
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    return (
      <>
        <Helmet>
          <title>Awaiting approval | {brand.publisherShort}</title>
        </Helmet>
        <div className={styles.shell}>
          <div className={styles.card}>
            <VeraxLogo />
            <div className={styles.pendingIcon}>
              <FaClock size={22} />
            </div>
            <h1 className={styles.title}>Admin account created — awaiting approval</h1>
            <p className={styles.sub}>
              <strong>{pending.email}</strong> was registered as an admin, but an existing admin has to approve it
              before you can access the dashboard. You&apos;ll be able to sign in as soon as that happens.
            </p>
            <FlatButton onClick={() => navigate('/login')}>Go to sign in</FlatButton>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Create account | {brand.publisherShort}</title>
      </Helmet>
      <div className={styles.shell}>
        <button className={styles.back} onClick={() => navigate('/')} type="button">
          <FaArrowLeft size={12} /> Back
        </button>
        <form className={styles.card} onSubmit={handleSubmit}>
          <VeraxLogo />
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.sub}>Choose the kind of account you need.</p>

          {/* Role picker */}
          <div className={styles.roles} role="radiogroup" aria-label="Account type">
            <button
              type="button"
              role="radio"
              aria-checked={role === 'writer'}
              className={`${styles.role} ${role === 'writer' ? styles.roleActive : ''}`}
              onClick={() => setRole('writer')}
            >
              <FaUserEdit size={16} />
              <span className={styles.roleName}>Writer</span>
              <span className={styles.roleHint}>See your statements and earnings</span>
              {role === 'writer' && <FaCheck className={styles.roleCheck} size={11} />}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === 'admin'}
              className={`${styles.role} ${role === 'admin' ? styles.roleActive : ''}`}
              onClick={() => setRole('admin')}
            >
              <FaUserShield size={16} />
              <span className={styles.roleName}>Admin</span>
              <span className={styles.roleHint}>Ingest, verify and distribute statements</span>
              {role === 'admin' && <FaCheck className={styles.roleCheck} size={11} />}
            </button>
          </div>

          {role === 'admin' && (
            <div className={styles.adminNotice}>
              <FaUserShield size={12} />
              <span>
                Admin accounts are restricted: you need a signup code, and an existing admin must approve the account
                before it can be used.
              </span>
            </div>
          )}

          <Input label="Email" type="email" value={email} onValueChange={setEmail} isRequired autoComplete="email" />
          <Input
            label="Username"
            value={username}
            onValueChange={setUsername}
            isRequired
            autoComplete="username"
            description="3–30 characters"
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onValueChange={setPassword}
            isRequired
            autoComplete="new-password"
            endContent={
              <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password">
                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </button>
            }
          />
          {role === 'admin' && (
            <Input
              label="Admin signup code"
              value={adminCode}
              onValueChange={setAdminCode}
              isRequired
              autoComplete="off"
              description="Provided by the publisher"
            />
          )}

          {error && <div className={styles.error}>{error}</div>}

          {/* FlatButton renders a <div>, which can't submit the form via
              type="submit" — call handleSubmit on click instead. */}
          <FlatButton onClick={loading ? undefined : handleSubmit}>
            {loading ? <CircularProgress size={16} /> : `Create ${role} account`}
          </FlatButton>

          <p className={styles.footer}>
            Already have an account?{' '}
            <button type="button" className={styles.link} onClick={() => navigate('/login')}>
              Sign in
            </button>
          </p>
        </form>
      </div>
    </>
  );
};

export default Register;
