import { SubscriptionContextProvider } from '../SubscriptionContext/SubscriptionContext';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import GlassButton from '../Buttons/GlassButton/GlassButton';
import { useContext, useState } from 'react';
import { styled, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import urlJoin from 'url-join';
import './subscriptionbutton.css';

const RoundedLinearProgress = styled(LinearProgress)(({ theme }) => ({
  borderRadius: 5,
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
  },
}));

const SubscriptionButton = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const { currentTheme } = useContext(ThemeContext);

  const handleOnClickSubscriptionButton = () => {
    // For FREE tier, navigate to pricing page
    if (subscription?.tier === 'FREE') {
      navigate('/pricing');
      return;
    }

    // For paid tiers, open billing portal
    async function openBillingSession() {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios({
          method: 'GET',
          url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'stripe/billing-portal'),
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 200) {
          window.location.href = response.data;
        }
      } catch (error) {
        console.error('Error opening billing portal:', error);

        // Handle authentication errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Authentication failed, redirecting to login');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          // Handle other errors
          console.error('Failed to open billing portal:', error.response?.data?.detail || error.message);
          alert('Failed to open billing portal. Please try again later.');
        }
      }
    }
    openBillingSession();
  };

  const subscriptionContext = useContext(SubscriptionContextProvider);
  const subscription = subscriptionContext?.subscription;

  // Handle loading state
  if (!subscription) {
    return null;
  }

  const uploadedPercentage = 100 * (subscription.scans / subscription.threshold);
  const catalogPercentage =
    subscription.catalog_limit > 0 ? 100 * (subscription.catalog_used / subscription.catalog_limit) : 0;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative' }}
    >
      <GlassButton onClick={() => handleOnClickSubscriptionButton()}>
        <div style={{ minWidth: '120px' }}>
          {/* Compact View */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-medium" style={{ letterSpacing: '0.05em' }}>
              {subscription.tier.toUpperCase()}
            </div>
            {subscription.tier !== 'FREE' ? (
              <div className="flex gap-1.5 text-xs">
                <span
                  className="font-semibold"
                  style={{
                    color: uploadedPercentage > 100 ? '#ef4444' : '#10b981',
                  }}
                >
                  {Math.floor(uploadedPercentage)}%
                </span>
                <span className="text-gray-500">|</span>
                <span
                  className="font-semibold"
                  style={{
                    color: catalogPercentage > 100 ? '#ef4444' : '#3b82f6',
                  }}
                >
                  {Math.floor(catalogPercentage)}%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-text)' }}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.7 }}
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span className="font-medium" style={{ fontSize: '11px' }}>
                  Upgrade
                </span>
              </div>
            )}
          </div>
        </div>
      </GlassButton>

      {/* Expanded View on Hover */}
      {isHovered && subscription.tier === 'FREE' && (
        <div className="subscription-dropdown">
          <div className="subscription-dropdown-panel">
            <div className="space-y-2">
              <div className={`text-xs font-semibold ${currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                Free Tier Limitations
              </div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="text-red-500 mt-0.5" style={{ fontSize: '10px' }}>
                    ✗
                  </div>
                  <div className={`text-xs ${currentTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    No scans available
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-red-500 mt-0.5" style={{ fontSize: '10px' }}>
                    ✗
                  </div>
                  <div className={`text-xs ${currentTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    Limited catalog access
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-red-500 mt-0.5" style={{ fontSize: '10px' }}>
                    ✗
                  </div>
                  <div className={`text-xs ${currentTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    No historical analytics
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isHovered && subscription.tier !== 'FREE' && (
        <div className="subscription-dropdown">
          <div className="subscription-dropdown-panel">
            <div className="space-y-3">
              {/* Scans Usage */}
              <div>
                <div className="flex justify-between gap-2 mb-1.5">
                  <div className={`text-xs ${currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>Scans</div>
                  <div className={`text-xs ${currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                    {subscription.scans}/{subscription.threshold}
                  </div>
                </div>
                <RoundedLinearProgress
                  sx={{
                    height: 5,
                    backgroundColor: 'rgba(55, 65, 81, 0.1)', // gray-700 with opacity for show
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: uploadedPercentage > 100 ? '#ef4444' : '#10b981',
                      minWidth: uploadedPercentage < 1 ? '3px' : undefined, // show minimal bar even at 0
                    },
                  }}
                  variant="determinate"
                  value={uploadedPercentage < 1 ? 1 : Math.min(100, uploadedPercentage)}
                />
              </div>

              {/* Catalog Usage */}
              <div>
                <div className="flex justify-between gap-2 mb-1.5">
                  <div className={`text-xs ${currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                    Catalog
                  </div>
                  <div className={`text-xs ${currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                    {subscription.catalog_used || 0}/{subscription.catalog_limit || 0}
                  </div>
                </div>
                <RoundedLinearProgress
                  sx={{
                    height: 5,
                    backgroundColor: 'rgba(55, 65, 81, 0.1)', // gray-700 with opacity for show
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: catalogPercentage > 100 ? '#ef4444' : '#3b82f6',
                      minWidth: catalogPercentage < 1 ? '3px' : undefined, // show minimal bar even at 0
                    },
                  }}
                  variant="determinate"
                  value={catalogPercentage < 1 ? 1 : Math.min(100, catalogPercentage)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionButton;
