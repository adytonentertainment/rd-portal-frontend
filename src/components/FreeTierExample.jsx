import React, { useState } from 'react';
import { LockedMetric } from './LockedMetric';
import { LockedChart } from './LockedChart';
import '../styles/unlock-animations.css';

/**
 * Example component showing how to use free tier gating
 *
 * USAGE IN YOUR CATALOG.JSX:
 *
 * 1. Import at the top:
 *    import { LockedMetric } from '../components/LockedMetric';
 *    import { LockedChart } from '../components/LockedChart';
 *
 * 2. Add user tier state (replace with your actual auth logic):
 *    const userTier = 'free'; // or 'premium' from your auth context
 *    const isFreeTier = userTier === 'free';
 *
 * 3. For locked metrics, replace your metric card with:
 *    {isFreeTier ? (
 *      <LockedMetric
 *        label="Total Streams"
 *        value={playcount.toLocaleString()}
 *        upgradeUrl="/upgrade"
 *        showClaimButton={false}
 *      />
 *    ) : (
 *      <YourNormalMetricCard />
 *    )}
 *
 * 4. For locked charts, wrap your chart:
 *    {isFreeTier ? (
 *      <LockedChart
 *        title="Stream Analytics"
 *        height="450px"
 *        upgradeUrl="/upgrade"
 *      >
 *        <YourChartComponent />
 *      </LockedChart>
 *    ) : (
 *      <YourChartComponent />
 *    )}
 */

export const FreeTierExample = () => {
  // Toggle between free and premium tier for demo
  const [userTier, setUserTier] = useState('free');
  const isFreeTier = userTier === 'free';

  // Mock data
  const metrics = {
    totalRevenue: 1234.56,
    totalStreams: 567890,
    spotifyStreams: 450000,
    youtubeStreams: 117890,
  };

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        background: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      {/* Demo Toggle */}
      <div
        style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <strong>Demo Mode:</strong> Currently viewing as <strong>{userTier}</strong> tier
        </div>
        <button
          onClick={() => setUserTier(userTier === 'free' ? 'premium' : 'free')}
          style={{
            background: userTier === 'free' ? '#28a745' : '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Switch to {userTier === 'free' ? 'Premium' : 'Free'} Tier
        </button>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Total Revenue - ALWAYS VISIBLE */}
        <div
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '8px',
              fontWeight: '500',
            }}
          >
            Total Revenue
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#28a745',
            }}
          >
            ${metrics.totalRevenue.toFixed(2)}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#999',
              marginTop: '8px',
            }}
          >
            ✅ Always visible (free tier)
          </div>
        </div>

        {/* Total Streams - LOCKED for free tier */}
        {isFreeTier ? (
          <LockedMetric
            label="Total Streams"
            value={metrics.totalStreams.toLocaleString()}
            upgradeUrl="/upgrade"
            showClaimButton={false}
          />
        ) : (
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '8px',
                fontWeight: '500',
              }}
            >
              Total Streams
            </div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              {metrics.totalStreams.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#999',
                marginTop: '8px',
              }}
            >
              🔓 Unlocked (premium tier)
            </div>
          </div>
        )}

        {/* Spotify Streams - LOCKED for free tier */}
        {isFreeTier ? (
          <LockedMetric
            label="Spotify Streams"
            value={metrics.spotifyStreams.toLocaleString()}
            upgradeUrl="/upgrade"
            showClaimButton={false}
          />
        ) : (
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '8px',
                fontWeight: '500',
              }}
            >
              Spotify Streams
            </div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#1DB954',
              }}
            >
              {metrics.spotifyStreams.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#999',
                marginTop: '8px',
              }}
            >
              🔓 Unlocked (premium tier)
            </div>
          </div>
        )}

        {/* YouTube Streams - LOCKED for free tier */}
        {isFreeTier ? (
          <LockedMetric
            label="YouTube Streams"
            value={metrics.youtubeStreams.toLocaleString()}
            upgradeUrl="/upgrade"
            showClaimButton={true}
          />
        ) : (
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '8px',
                fontWeight: '500',
              }}
            >
              YouTube Streams
            </div>
            <div
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#FF0000',
              }}
            >
              {metrics.youtubeStreams.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#999',
                marginTop: '8px',
              }}
            >
              🔓 Unlocked (premium tier)
            </div>
          </div>
        )}
      </div>

      {/* Stream Chart - LOCKED for free tier */}
      {isFreeTier ? (
        <LockedChart title="Stream Analytics" height="450px" upgradeUrl="/upgrade">
          {/* Mock chart as blurred preview */}
          <div
            style={{
              height: '300px',
              background: 'linear-gradient(180deg, #667eea20 0%, #764ba220 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Fake chart bars */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                height: '200px',
              }}
            >
              {[60, 80, 70, 90, 75, 85, 95].map((height, i) => (
                <div
                  key={i}
                  style={{
                    width: '40px',
                    height: `${height}%`,
                    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              ))}
            </div>
          </div>
        </LockedChart>
      ) : (
        <div
          style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>Stream Analytics 🔓</h3>
          {/* Mock unlocked chart */}
          <div
            style={{
              height: '300px',
              background: 'linear-gradient(180deg, #667eea20 0%, #764ba220 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                height: '200px',
              }}
            >
              {[60, 80, 70, 90, 75, 85, 95].map((height, i) => (
                <div
                  key={i}
                  style={{
                    width: '40px',
                    height: `${height}%`,
                    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: '16px',
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
            }}
          >
            Premium tier - Full analytics unlocked
          </div>
        </div>
      )}

      {/* Integration Instructions */}
      <div
        style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginTop: '32px',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0' }}>✅ Integration Checklist</h2>
        <ul style={{ lineHeight: '2' }}>
          <li>✅ Revenue metric is always visible for free tier</li>
          <li>✅ Streams metrics show locked overlay with blur</li>
          <li>✅ Chart shows locked overlay with blur</li>
          <li>✅ Lock emoji changes to unlocked (🔒 → 🔓) on hover</li>
          <li>✅ Lock rotates and lifts slightly on hover (unlock animation)</li>
          <li>✅ Clicking locked areas redirects to /upgrade</li>
          <li>✅ "Claim Your Revenue" button appears and is clickable</li>
          <li>✅ Smooth transitions between locked/unlocked states</li>
        </ul>
      </div>
    </div>
  );
};
