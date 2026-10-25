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
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageToggle from '../../components/LanguageToggle/LanguageToggle';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (sent || isLoading) return;
    setErrorMessage('');

    if (!email) {
      setErrorMessage(t('auth.enterEmail'));
      return;
    }
    if (!isValidEmailAddress(email)) {
      setErrorMessage(t('auth.invalidEmail'));
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
      setErrorMessage(t('auth.somethingWrong'));
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
        style={{ overflow: 'auto', padding: '20px', background: 'var(--background)', position: 'relative' }}
      >
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <LanguageToggle />
        </div>
        <VeraxLogo width={180} className="mb-6" />
        <Card
          className="w-full max-w-md p-4"
          shadow="lg"
          style={{ background: 'var(--card-bg)', color: 'var(--text)' }}
        >
          <CardHeader className="flex flex-col gap-1 pb-4">
            <h1 className="text-xl font-semibold text-center" style={{ color: 'var(--text)' }}>
              {t('auth.resetTitle')}
            </h1>
          </CardHeader>
          <CardBody className="gap-4">
            {sent ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '8px' }}>{t('auth.resetSent')}</p>
                <p style={{ fontSize: '13px', color: 'var(--soft-text)' }}>{t('auth.checkInbox')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p style={{ fontSize: '14px', color: 'var(--soft-text)', textAlign: 'center', marginBottom: '4px' }}>
                  {t('auth.resetIntro')}
                </p>
                <Input
                  type="email"
                  label={t('auth.email')}
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
                  {isLoading ? <CircularProgress size={24} style={{ color: '#1a1a1a' }} /> : t('auth.sendReset')}
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
            <div>{t('auth.backToLogin')}</div>
          </div>
        </TransparentButton>
      </div>
    </>
  );
};

export default ForgotPassword;
