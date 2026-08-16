import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa';
import { SiApplemusic } from 'react-icons/si';

const scanResults = [
  { title: 'Summer Vibes', artist: 'DJ Producer', match: '94%' },
  { title: 'Night Beats', artist: 'MC Flow', match: '87%' },
  { title: 'Summer Remix', artist: 'The Producer', match: '82%' },
];

export function DiscoveryCard({ theme = 'dark' }) {
  const isLight = theme === 'light';

  const cardBg = isLight ? '#ffffff' : '#000000';
  const cardBorder = isLight ? '#e2ddd5' : 'rgba(255, 255, 255, 0.05)';
  const textPrimary = isLight ? '#111111' : '#f5f5f5';
  const textSecondary = isLight ? '#525252' : '#a3a3a3';
  const textMuted = isLight ? '#a3a3a3' : '#737373';
  const panelBg = isLight ? '#f5f5f5' : '#0a0a0a';
  const panelBorder = isLight ? '#e5e5e5' : '#262626';
  const inputBg = isLight ? '#f0f0f0' : '#111111';
  const inputBorder = isLight ? '#d4d4d4' : '#333333';
  const resultBg = isLight ? '#fafafa' : '#0d0d0d';
  const resultBorder = isLight ? '#eeeeee' : '#1a1a1a';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'relative',
        width: '400px',
        height: '480px',
        overflow: 'hidden',
        borderRadius: '16px',
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isLight ? '0 2px 16px rgba(0, 0, 0, 0.06)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: textPrimary, margin: '0 0 6px 0' }}>Song Discovery</h2>
        <p style={{ fontSize: '14px', color: textSecondary, margin: 0 }}>
          Scan your works for unauthorized usage across DSPs
        </p>
      </div>

      {/* Search / Scan Header Panel */}
      <div
        style={{
          background: panelBg,
          borderRadius: '12px',
          padding: '12px',
          border: `1px solid ${panelBorder}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: textPrimary }}>Scan Your Works</div>
          <span
            style={{
              fontSize: '12px',
              padding: '4px 10px',
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              borderRadius: '6px',
              fontWeight: 500,
            }}
          >
            4 Results Found
          </span>
        </div>
        <div style={{ fontSize: '13px', color: textMuted, marginBottom: '8px' }}>
          Upload beats to scan for usage across DSPs
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <Search style={{ width: '14px', height: '14px', color: textMuted }} />
          <span style={{ fontSize: '13px', color: textMuted }}>Search scans...</span>
        </div>
      </div>

      {/* Scan Results - Expanded */}
      <div
        style={{
          background: panelBg,
          borderRadius: '12px',
          border: `1px solid ${panelBorder}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${panelBorder}`,
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>summer_nights_beat.mp3</span>
          <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>3 matches</span>
        </div>
        {scanResults.map((result, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              padding: '8px 16px',
              background: resultBg,
              borderBottom: idx < 2 ? `1px solid ${resultBorder}` : 'none',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: `linear-gradient(135deg, ${panelBg}, ${panelBorder})`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {result.title}
              </div>
              <div style={{ fontSize: '12px', color: textSecondary }}>{result.artist}</div>
            </div>
            <span style={{ fontSize: '13px', color: isLight ? '#111111' : '#00e5ff', fontWeight: 600, flexShrink: 0 }}>
              {result.match}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <FaSpotify size={14} style={{ color: '#1DB954' }} />
              <SiApplemusic size={14} style={{ color: '#FC3C44' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Second Scan - Collapsed */}
      <div
        style={{
          background: panelBg,
          borderRadius: '12px',
          border: `1px solid ${panelBorder}`,
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500, color: textPrimary }}>midnight_drive.mp3</span>
        <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>1 match</span>
      </div>

      {/* Decorative corner accent */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: '128px',
          width: '128px',
          borderTopLeftRadius: '100%',
          background: isLight
            ? 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.06), transparent)'
            : 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.1), transparent)',
        }}
      />
    </motion.div>
  );
}
