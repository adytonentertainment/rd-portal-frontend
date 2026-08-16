import { useRef, useState } from 'react';
import { Card, CardHeader, CardBody, Input } from '@heroui/react';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import TransparentButton from '../../components/Buttons/TransparentButton/TransparentButton';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';
import { isValidEmailAddress } from '../../misc/helper';
import { Helmet } from 'react-helmet-async';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import { FaArrowLeft } from 'react-icons/fa6';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (sent || isLoading) return;
    setErrorMessage('');

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!isValidEmailAddress(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios({
        method: 'POST',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/send-reset-password-email'),
        headers: { accept: 'application/json' },
        data: { email },
      });
      if (response.status === 200) setSent(true);
    } catch (error) {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>RD - Forgot Password</title>
      </Helmet>
      <div
        className="flex items-center justify-center w-screen h-screen flex-col"
        style={{ overflow: 'auto', padding: '20px', background: 'var(--background)' }}
      >
        <VeraxLogo width={180} className="mb-6" />
        <Card
          className="w-full max-w-md p-4"
          shadow="lg"
          style={{ background: 'var(--card-bg)', color: 'var(--text)' }}
        >
          <CardHeader className="flex flex-col gap-1 pb-4">
            <h1 className="text-xl font-semibold text-center" style={{ color: 'var(--text)' }}>
              Reset Password
            </h1>
          </CardHeader>
          <CardBody className="gap-4">
            {sent ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '8px' }}>
                  If an account exists for that email, we've sent a reset link.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--soft-text)' }}>Check your inbox and spam folder.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p style={{ fontSize: '14px', color: 'var(--soft-text)', textAlign: 'center', marginBottom: '4px' }}>
                  Enter your email and we'll send you a reset link.
                </p>
                <Input
                  type="email"
                  label="Email"
                  variant="bordered"
                  size="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  classNames={{ input: 'text-base', label: 'text-sm font-medium' }}
                />

                <FlatButton
                  className="mx-auto mt-2"
                  style={{ width: '100%', maxWidth: '300px' }}
                  onClick={handleSubmit}
                >
                  {isLoading ? <CircularProgress size={24} style={{ color: '#1a1a1a' }} /> : 'Send Reset Link'}
                </FlatButton>

                {errorMessage && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: 'rgb(239, 68, 68)',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    {errorMessage}
                  </div>
                )}
              </form>
            )}
          </CardBody>
        </Card>
        <TransparentButton className="mt-4" onClick={() => navigate('/login')}>
          <div className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
            <FaArrowLeft />
            <div>Back to Login</div>
          </div>
        </TransparentButton>
      </div>
    </>
  );
};

export default ForgotPassword;
