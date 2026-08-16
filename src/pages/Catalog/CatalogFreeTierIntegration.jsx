/**
 * COPY THIS CODE INTO YOUR CATALOG.JSX TO ADD FREE TIER GATING
 *
 * This shows you exactly where to add the free tier logic
 */

import React, { useState } from 'react';
import { LockedMetric } from '../../components/LockedMetric';
import { LockedChart } from '../../components/LockedChart';

// ============================================
// STEP 1: Add this at the top of your Catalog component
// ============================================

function CatalogWithFreeTier() {
  // For now, hardcode to 'free' for testing
  // TODO: Replace with actual auth logic: const { userTier } = useAuth();
  const [userTier] = useState('free'); // Change to 'pro' to test unlocked state
  const isFreeTier = userTier === 'free';

  // Add a debug toggle (remove in production)
  const [debugMode, setDebugMode] = useState(false);

  // Your existing state
  const [playcount, setPlaycount] = useState(0);
  const [spotifyPlaycount, setSpotifyPlaycount] = useState(0);
  const [youtubePlaycount, setYoutubePlaycount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [stats, setStats] = useState(null);

  return (
    <div className="catalog-page">
      {/* Debug Toggle - Remove in production */}
      {debugMode && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'white',
            padding: '10px',
            border: '2px solid #667eea',
            borderRadius: '8px',
            zIndex: 9999,
          }}
        >
          <strong>Debug: Tier = {userTier}</strong>
          <button onClick={() => window.location.reload()}>Refresh to test</button>
        </div>
      )}

      {/* ============================================
          STEP 2: Metrics Section
          Keep Revenue visible, lock Streams
          ============================================ */}

      <div className="metrics-grid">
        {/* Revenue - ALWAYS VISIBLE for free tier */}
        <div className="metric-card">
          <div className="label">Total Revenue</div>
          <div className="value" style={{ color: '#28a745' }}>
            ${revenue.toFixed(2)}
          </div>
          <div className="sublabel">Last 30 days</div>
        </div>

        {/* Total Streams - LOCKED for free tier */}
        {isFreeTier ? (
          <LockedMetric
            label="Total Streams"
            value={playcount.toLocaleString()}
            upgradeUrl="/upgrade"
            showClaimButton={false}
          />
        ) : (
          <div className="metric-card">
            <div className="label">Total Streams</div>
            <div className="value">{playcount.toLocaleString()}</div>
            <div className="sublabel">Last 30 days</div>
          </div>
        )}

        {/* Spotify Streams - LOCKED for free tier */}
        {isFreeTier ? (
          <LockedMetric
            label="Spotify Streams"
            value={spotifyPlaycount.toLocaleString()}
            upgradeUrl="/upgrade"
            showClaimButton={false}
          />
        ) : (
          <div className="metric-card">
            <div className="label">Spotify Streams</div>
            <div className="value" style={{ color: '#1DB954' }}>
              {spotifyPlaycount.toLocaleString()}
            </div>
            <div className="sublabel">Last 30 days</div>
          </div>
        )}

        {/* YouTube Streams - LOCKED for free tier */}
        {isFreeTier ? (
          <LockedMetric
            label="YouTube Streams"
            value={youtubePlaycount.toLocaleString()}
            upgradeUrl="/upgrade"
            showClaimButton={true}
          />
        ) : (
          <div className="metric-card">
            <div className="label">YouTube Streams</div>
            <div className="value" style={{ color: '#FF0000' }}>
              {youtubePlaycount.toLocaleString()}
            </div>
            <div className="sublabel">Last 30 days</div>
          </div>
        )}
      </div>

      {/* ============================================
          STEP 3: Chart Section
          Lock chart for free tier
          ============================================ */}

      {isFreeTier ? (
        <LockedChart title="Stream Analytics" height="450px" upgradeUrl="/upgrade">
          {/* Your UltraFastGraph will be shown blurred underneath */}
          <YourChartComponent data={stats} />
        </LockedChart>
      ) : (
        <div className="chart-container">
          <h3>Stream Analytics</h3>
          <YourChartComponent data={stats} />
        </div>
      )}

      {/* Rest of your catalog content... */}
    </div>
  );
}

// ============================================
// INSTRUCTIONS FOR YOUR ACTUAL CATALOG.JSX:
// ============================================

/**
 * 1. Add imports at the top of Catalog.jsx:
 *
 *    import { LockedMetric } from '../components/LockedMetric';
 *    import { LockedChart } from '../components/LockedChart';
 *
 *
 * 2. Add user tier detection at the start of your Catalog function:
 *
 *    const [userTier] = useState('free'); // Hardcoded for now
 *    const isFreeTier = userTier === 'free';
 *
 *
 * 3. Wrap your stream metrics with conditional rendering:
 *
 *    {isFreeTier ? (
 *      <LockedMetric label="..." value="..." />
 *    ) : (
 *      <YourNormalMetric />
 *    )}
 *
 *
 * 4. Wrap your chart with conditional rendering:
 *
 *    {isFreeTier ? (
 *      <LockedChart>
 *        <UltraFastGraph data={stats} />
 *      </LockedChart>
 *    ) : (
 *      <UltraFastGraph data={stats} />
 *    )}
 *
 *
 * 5. Test:
 *    - With userTier='free' → Should see locks with animation
 *    - With userTier='pro' → Should see normal unlocked content
 *
 *
 * 6. When ready for production, replace hardcoded tier with real auth:
 *
 *    Option A: Use auth context
 *    const { user } = useAuth();
 *    const isFreeTier = !user?.subscription || user.subscription.tier === 'free';
 *
 *    Option B: Fetch from API
 *    const [userTier, setUserTier] = useState('free');
 *    useEffect(() => {
 *      fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` }})
 *        .then(res => res.json())
 *        .then(data => setUserTier(data.tier));
 *    }, []);
 */

// Mock component placeholders
function YourChartComponent({ data }) {
  return <div>Your actual chart component here</div>;
}

export default CatalogWithFreeTier;
