import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar/NavBar';

const EmailConfirmed = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/pricing'), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

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
            border: '2px solid var(--border)',
            borderRadius: '16px',
            padding: '48px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '4px 4px 0px var(--border)',
          }}
        >
          {/* Success Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
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
              stroke="rgb(34, 197, 94)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
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
            Email Confirmed!
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
            Your account has been successfully activated. Redirecting you to pricing...
          </p>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              maxWidth: '280px',
              margin: '0 auto',
            }}
          >
            <button
              onClick={() => navigate('/pricing')}
              style={{
                padding: '14px 28px',
                background: 'var(--text)',
                border: '2px solid var(--text)',
                borderRadius: '8px',
                color: 'var(--background)',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              View Pricing Plans
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '14px 28px',
                background: 'transparent',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-overlay)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
export default EmailConfirmed;
