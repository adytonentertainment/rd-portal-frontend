import React, { useState, useEffect } from 'react';
import { FaCrown, FaMusic, FaFingerprint } from 'react-icons/fa';
import styles from './SubscriptionCard.module.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const SubscriptionCard = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/user/subscription`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch subscription');
        }

        const data = await response.json();
        setSubscription(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !subscription) {
    return null;
  }

  const getTierColor = (tier) => {
    const colors = {
      Free: '#6b7280',
      Essential: '#3b82f6',
      Pro: '#8b5cf6',
      Elite: '#f59e0b',
      Enterprise: '#ef4444',
    };
    return colors[tier] || colors.Free;
  };

  const getPercentage = (used, limit) => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const scansPercentage = getPercentage(subscription.scans_used, subscription.scans_limit);
  const catalogPercentage = getPercentage(subscription.catalog_used, subscription.catalog_limit);

  return (
    <div className={styles.card}>
      {/* Tier Tooltip - Shows on hover */}
      <div className={styles.tierTooltip} style={{ background: getTierColor(subscription.tier) }}>
        <FaCrown size={10} />
        <span>{subscription.tier}</span>
      </div>

      {/* Usage Stats */}
      <div className={styles.stats}>
        {/* Scans */}
        <div className={styles.statItem}>
          <div className={styles.statHeader}>
            <FaFingerprint size={12} />
            <span className={styles.statLabel}>Scans</span>
          </div>
          <div className={styles.statValue}>
            {subscription.scans_used}
            {subscription.scans_limit !== -1 && ` / ${subscription.scans_limit}`}
            {subscription.scans_limit === -1 && ' / ∞'}
          </div>
          {subscription.scans_limit !== -1 && subscription.scans_limit > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${scansPercentage}%`,
                  background: scansPercentage > 80 ? '#ef4444' : getTierColor(subscription.tier),
                }}
              />
            </div>
          )}
        </div>

        {/* Catalog */}
        <div className={styles.statItem}>
          <div className={styles.statHeader}>
            <FaMusic size={12} />
            <span className={styles.statLabel}>Catalog</span>
          </div>
          <div className={styles.statValue}>
            {subscription.catalog_used}
            {subscription.catalog_limit !== -1 && ` / ${subscription.catalog_limit}`}
            {subscription.catalog_limit === -1 && ' / ∞'}
          </div>
          {subscription.catalog_limit !== -1 && subscription.catalog_limit > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${catalogPercentage}%`,
                  background: catalogPercentage > 80 ? '#ef4444' : getTierColor(subscription.tier),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
