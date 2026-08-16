import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import styles from './PremiumLockOverlay.module.css';

const PremiumLockOverlay = () => {
  const navigate = useNavigate();
  const { currentTheme } = useContext(ThemeContext);

  const handleUpgrade = () => {
    // Navigate to upgrade/billing page
    navigate('/pricing');
  };

  return (
    <div className={styles.lockOverlay} data-theme={currentTheme}>
      <div className={styles.lockContainer}>
        {/* Animated Lock Icon */}
        <div className={styles.lockIcon}>
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Metallic gold gradient for lock body */}
              <linearGradient id="lockBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#ffd700', stopOpacity: 1 }} />
                <stop offset="25%" style={{ stopColor: '#ffed4e', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#d4af37', stopOpacity: 1 }} />
                <stop offset="75%" style={{ stopColor: '#ffed4e', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#b8860b', stopOpacity: 1 }} />
              </linearGradient>

              {/* Shackle metallic gradient */}
              <linearGradient id="shackleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#e5e5e5', stopOpacity: 1 }} />
                <stop offset="25%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#b0b0b0', stopOpacity: 1 }} />
                <stop offset="75%" style={{ stopColor: '#d4d4d4', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#8c8c8c', stopOpacity: 1 }} />
              </linearGradient>

              {/* Inner shadow for depth */}
              <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feFlood floodColor="#000000" floodOpacity="0.5" />
                <feComposite in2="offsetblur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Outer glow */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Specular highlights */}
              <radialGradient id="highlight" cx="40%" cy="30%">
                <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.8 }} />
                <stop offset="50%" style={{ stopColor: '#ffffff', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0 }} />
              </radialGradient>
            </defs>

            {/* Lock Shackle - Right side opens on hover */}
            <g className={styles.shackleGroup}>
              {/* Shackle shadow */}
              <path
                d="M 35 45 L 35 30 Q 35 10, 60 10"
                fill="none"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="7"
                strokeLinecap="round"
                transform="translate(2, 2)"
              />
              <path
                d="M 60 10 Q 85 10, 85 30 L 85 45"
                fill="none"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="7"
                strokeLinecap="round"
                transform="translate(2, 2)"
              />

              {/* Left side of shackle - stays fixed */}
              <path
                className={styles.lockShackleLeft}
                d="M 35 45 L 35 30 Q 35 10, 60 10"
                fill="none"
                stroke="url(#shackleGradient)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Right side of shackle - rotates open */}
              <path
                className={styles.lockShackleRight}
                d="M 60 10 Q 85 10, 85 30 L 85 45"
                fill="none"
                stroke="url(#shackleGradient)"
                strokeWidth="7"
                strokeLinecap="round"
              />
            </g>

            {/* Lock Body Shadow */}
            <rect x="27" y="48" width="70" height="50" rx="8" fill="rgba(0,0,0,0.4)" />

            {/* Lock Body */}
            <rect
              className={styles.lockBody}
              x="25"
              y="45"
              width="70"
              height="50"
              rx="8"
              fill="url(#lockBodyGradient)"
              filter="url(#glow)"
            />

            {/* Lock body highlight */}
            <ellipse cx="55" cy="60" rx="25" ry="20" fill="url(#highlight)" />

            {/* Lock body inner shadow for depth */}
            <rect x="25" y="45" width="70" height="50" rx="8" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />

            {/* Keyhole outer ring */}
            <circle cx="60" cy="67" r="8" fill="rgba(0,0,0,0.3)" />
            <circle cx="60" cy="67" r="7" fill="rgba(50,50,50,0.8)" />

            {/* Keyhole */}
            <circle cx="60" cy="67" r="5" fill="#1a1a1a" />
            <path d="M 57 67 L 56 82 L 64 82 L 63 67 Z" fill="#1a1a1a" />

            {/* Keyhole highlight */}
            <circle cx="59" cy="66" r="2" fill="rgba(255,255,255,0.2)" />

            {/* Bottom edge highlight */}
            <rect x="27" y="92" width="66" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
          </svg>

          {/* Floating Particles */}
          <div className={styles.particles}>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
          </div>
        </div>

        {/* Main Content */}
        <h1 className={styles.title}>Unlock Complete Stream Analytics</h1>
        <p className={styles.subtitle}>See exactly where your plays and revenue come from.</p>

        {/* Features List */}
        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <span className={styles.featureText}>Track-by-track performance data</span>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <span className={styles.featureText}>Platform comparison insights</span>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <span className={styles.featureText}>Export detailed reports</span>
          </div>
        </div>

        {/* CTA Button */}
        <button className={styles.ctaButton} onClick={handleUpgrade}>
          Get An Upgrade
        </button>

        {/* Trust Badges */}
        <div className={styles.trustBadges}>
          <div className={styles.trustBadge}>
            <svg viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span>Secure Payment</span>
          </div>
          <div className={styles.trustBadge}>
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>30-Day Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumLockOverlay;
