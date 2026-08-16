import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import urlJoin from 'url-join';
import NavBar from '../components/NavBar/NavBar';

const SignUpSuccessful = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (sending || sent) return;

    setSending(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/resend-verification'),
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSent(true);
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <NavBar />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 80px)',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '16px',
            padding: '48px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Email Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13L2 4" />
            </svg>
          </div>

          {/* Header */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '16px',
            }}
          >
            Account Created!
          </h1>

          {/* Message */}
          <p
            style={{
              fontSize: '16px',
              color: 'var(--muted-text)',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}
          >
            Please activate your account by visiting the email sent to you. Make sure to also check your spam folder.
          </p>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <button
              onClick={() => navigate('/pricing')}
              style={{
                padding: '14px 24px',
                background: 'var(--secondary)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--secondary-text)',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              View Pricing Plans
            </button>

            {sent ? (
              <div
                style={{
                  padding: '14px 24px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: '#22c55e',
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              >
                Verification email sent!
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={sending}
                style={{
                  padding: '14px 24px',
                  background: 'transparent',
                  border: '1px solid var(--button-border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: sending ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!sending) {
                    e.currentTarget.style.background = 'var(--input-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {sending ? 'Sending...' : 'Resend Activation Email'}
              </button>
            )}

            {error && <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>}
          </div>
        </div>
      </div>
    </>
  );
};
export default SignUpSuccessful;
