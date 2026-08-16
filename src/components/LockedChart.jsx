import React, { useState, useEffect } from 'react';

/**
 * Displays a chart with locked overlay and animated lock
 */
export const LockedChart = ({ children, title = 'Stream Analytics', height = '400px', upgradeUrl = '/pricing' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(theme === 'dark' || theme === null);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const handleClick = () => {
    window.location.href = upgradeUrl;
  };

  // Theme-aware colors
  const overlayBg = isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)';
  const textColor = isDarkMode ? '#ffffff' : '#1f2937';
  const subtextColor = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(31, 41, 55, 0.7)';
  const featureTextColor = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(31, 41, 55, 0.9)';
  const buttonBg = isDarkMode ? '#3b82f6' : '#2563eb';
  const buttonHoverBg = isDarkMode ? '#2563eb' : '#1d4ed8';
  const buttonShadow = isDarkMode ? '0 3px 6px rgba(59, 130, 246, 0.2)' : '0 3px 6px rgba(37, 99, 235, 0.3)';
  const buttonHoverShadow = isDarkMode ? '0 6px 12px rgba(59, 130, 246, 0.3)' : '0 6px 12px rgba(37, 99, 235, 0.4)';

  return (
    <div
      style={{
        position: 'relative',
        background: 'transparent',
        height: height === '100%' ? '100%' : height,
        width: '100%',
        flex: height === '100%' ? 1 : undefined,
        minHeight: height === '100%' ? 0 : undefined,
        overflow: 'hidden',
        borderRadius: '12px',
      }}
    >
      {/* Blurred mock data in background */}
      <div
        style={{
          filter: 'blur(5px)',
          opacity: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: overlayBg,
          backdropFilter: 'blur(2px)',
          cursor: 'pointer',
        }}
      >
        {/* Animated Lock from new version */}
        <div
          style={{
            fontSize: '36px',
            transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            transform: isHovered ? 'translateY(-6px) rotate(-15deg)' : 'translateY(0) rotate(0deg)',
            filter: isHovered ? 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.4))' : 'none',
            marginBottom: '16px',
          }}
        >
          {isHovered ? '🔓' : '🔒'}
        </div>

        {/* Heading - from previous version */}
        <div
          style={{
            fontSize: '20px',
            fontWeight: '600',
            color: textColor,
            marginBottom: '6px',
            textAlign: 'center',
          }}
        >
          Unlock Complete Stream Analytics
        </div>

        {/* Subheading - from previous version */}
        <div
          style={{
            fontSize: '13px',
            color: subtextColor,
            marginBottom: '18px',
            textAlign: 'center',
            maxWidth: '380px',
          }}
        >
          See exactly where your plays and revenue come from
        </div>

        {/* Feature list with checkmarks - from previous version */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: featureTextColor,
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
            <span>Track-by-track performance data</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: featureTextColor,
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
            <span>Platform comparison insights</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: featureTextColor,
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
            <span>Growth trends & predictions</span>
          </div>
        </div>

        {/* Upgrade button - from previous version */}
        <button
          onClick={handleClick}
          style={{
            background: buttonBg,
            color: '#ffffff',
            border: 'none',
            padding: '10px 28px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: isHovered ? buttonHoverShadow : buttonShadow,
          }}
          onMouseEnter={(e) => {
            e.target.style.background = buttonHoverBg;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = buttonBg;
          }}
        >
          Upgrade to Pro →
        </button>
      </div>
    </div>
  );
};
