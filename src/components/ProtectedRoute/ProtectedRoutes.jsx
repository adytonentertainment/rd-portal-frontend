import { Outlet, Navigate } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { UserContextProvider } from '../UserContext/UserContext';
import { SubscriptionContextProvider } from '../SubscriptionContext/SubscriptionContext';
import EmailVerificationBanner from '../EmailVerificationBanner/EmailVerificationBanner';
import VeraxLogo from '../VeraxLogo/VeraxLogo';

const MobileComingSoon = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '40px 24px',
      background: 'var(--background)',
      textAlign: 'center',
    }}
  >
    <VeraxLogo iconOnly width={70} className="mb-6" style={{ maxWidth: '70px', opacity: 1 }} />
    <h1
      style={{
        fontSize: '22px',
        fontWeight: 600,
        color: 'var(--text)',
        marginBottom: '12px',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      Coming Soon
    </h1>
    <p
      style={{
        fontSize: '14px',
        color: 'var(--muted-text)',
        lineHeight: 1.7,
        maxWidth: '320px',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      The mobile experience is on its way. For now, please visit RD on a desktop or laptop browser.
    </p>
    <a
      href="https://www.verax.app"
      style={{
        marginTop: '28px',
        fontSize: '13px',
        color: 'var(--text)',
        fontFamily: "'JetBrains Mono', monospace",
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
      }}
    >
      www.verax.app
    </a>
  </div>
);

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const ProtectedRoutes = ({ needsSubscription = false, requireEmailVerification = true }) => {
  const user = useContext(UserContextProvider);
  const subscriptionContext = useContext(SubscriptionContextProvider);
  const subscription = subscriptionContext?.subscription;
  const validSubscription = !needsSubscription || subscription;
  const isMobile = useIsMobile();
  const route =
    user && !subscription
      ? `/pricing`
      : `/login?redirect=${encodeURIComponent(window.location.href)}&lastpage=${encodeURIComponent(document.referrer)}`;

  // Still determining auth (async profile fetch in flight): render nothing
  // rather than bouncing a valid session to /login. `undefined` = loading,
  // `null` = confirmed logged-out.
  if (user === undefined) {
    return null;
  }

  // If user is not logged in, redirect
  if (!user) {
    return <Navigate to={route} />;
  }

  // Show mobile coming soon for authenticated app pages
  if (isMobile) {
    return <MobileComingSoon />;
  }

  // If email is not verified and verification is required, show banner and block access
  if (requireEmailVerification && !user.account_activated) {
    return (
      <>
        <EmailVerificationBanner email={user.email} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 60px)',
            padding: '40px 20px',
            background: 'var(--background)',
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
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 24px',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '2px solid rgba(220, 38, 38, 0.3)',
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
                stroke="rgb(220, 38, 38)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                <polyline points="3 7 12 13 21 7" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '16px',
              }}
            >
              Email Verification Required
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: 'var(--muted-text)',
                marginBottom: '8px',
                lineHeight: '1.6',
              }}
            >
              Please verify your email address to access the dashboard.
            </p>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--muted-text)',
                lineHeight: '1.6',
              }}
            >
              Check your inbox for a verification link. If you didn&apos;t receive the email, use the button in the
              banner above to resend it.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Check subscription if required
  if (!validSubscription) {
    return <Navigate to={route} />;
  }

  // outlet: Continues to render the child components of this component
  return <Outlet />;
};

export default ProtectedRoutes;
