import { useState } from 'react';
import { Card, CardHeader, CardBody, Input } from '@heroui/react';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import TransparentButton from '../../components/Buttons/TransparentButton/TransparentButton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import urlJoin from 'url-join';
import CircularProgress from '@mui/material/CircularProgress';
import { Helmet } from 'react-helmet-async';
import { validatePassword, getPasswordRequirements } from '../../utils/passwordValidator';
import VeraxLogo from '../../components/VeraxLogo/VeraxLogo';
import { FaArrowLeft } from 'react-icons/fa6';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setErrorMessage(validation.errors.join(', '));
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios({
        method: 'POST',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/reset-password'),
        headers: { accept: 'application/json' },
        data: {
          password_new: newPassword,
          password_new_retyped: confirmPassword,
          token: searchParams.get('token'),
        },
      });
      if (response.status === 200) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      setErrorMessage(detail || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>RD - Reset Password</title>
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
              Choose a New Password
            </h1>
          </CardHeader>
          <CardBody className="gap-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="password"
                label="New Password"
                variant="bordered"
                size="lg"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                classNames={{ input: 'text-base', label: 'text-sm font-medium' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--soft-text)', marginTop: '-4px', textAlign: 'center' }}>
                {getPasswordRequirements()}
              </p>
              <Input
                type="password"
                label="Confirm Password"
                variant="bordered"
                size="lg"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                classNames={{ input: 'text-base', label: 'text-sm font-medium' }}
              />

              <FlatButton className="mx-auto mt-2" style={{ width: '100%', maxWidth: '300px' }} onClick={handleSubmit}>
                {isLoading ? <CircularProgress size={24} style={{ color: '#1a1a1a' }} /> : 'Change Password'}
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

export default ResetPassword;
