import React, { useState } from 'react';

/**
 * Displays a metric card with locked/blurred content
 */
export const LockedMetric = ({ label, value, upgradeUrl = '/upgrade', showClaimButton = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.location.href = upgradeUrl;
  };

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--panel-bg)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid var(--panel-border)',
        overflow: 'hidden',
        height: '100%',
        minHeight: 'auto',
      }}
    >
      {/* Blurred content */}
      <div
        style={{
          filter: 'blur(6px)',
          opacity: 0.8,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--muted-text)',
            marginBottom: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            whiteSpace: 'nowrap',
            color: 'var(--text)',
          }}
        >
          {value}
        </div>
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
          background: 'rgba(17, 24, 39, 0.5)',
          backdropFilter: 'blur(2px)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: isHovered ? '1px solid var(--secondary)' : '1px solid transparent',
        }}
      >
        {/* Lock icon that unlocks on hover */}
        <div
          style={{
            fontSize: '32px',
            transition: 'transform 0.4s ease',
            transform: isHovered ? 'translateY(-5px) rotate(-15deg)' : 'translateY(0) rotate(0deg)',
          }}
        >
          {isHovered ? '🔓' : '🔒'}
        </div>

        {/* Upgrade text */}
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--secondary)',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          }}
        >
          {isHovered ? 'Click to Unlock →' : 'Upgrade to View'}
        </div>

        {/* Optional claim button */}
        {showClaimButton && (
          <button
            onClick={handleClick}
            style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            Claim Your Revenue
          </button>
        )}
      </div>
    </div>
  );
};
