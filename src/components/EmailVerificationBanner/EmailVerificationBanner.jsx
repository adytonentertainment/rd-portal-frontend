import { useState } from 'react';
import axios from 'axios';
import urlJoin from 'url-join';

const EmailVerificationBanner = ({ email }) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResendEmail = async () => {
    if (resending || resent) return;

    setResending(true);
    try {
      const token = localStorage.getItem('token');
      await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/resend-verification'),
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setResent(true);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '14px',
        fontWeight: 500,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>Please verify your email address ({email}) to access all features.</span>
      {resent ? (
        <span
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          Verification email sent!
        </span>
      ) : (
        <button
          onClick={handleResendEmail}
          disabled={resending}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: resending ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            opacity: resending ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!resending) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          {resending ? 'Sending...' : 'Resend verification email'}
        </button>
      )}
    </div>
  );
};

export default EmailVerificationBanner;
