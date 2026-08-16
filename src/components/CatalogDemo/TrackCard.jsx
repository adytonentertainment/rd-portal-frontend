import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useState } from 'react';

const streamData = [
  { month: 'Jan', streams: 450000, revenue: 1850 },
  { month: 'Feb', streams: 520000, revenue: 2140 },
  { month: 'Mar', streams: 680000, revenue: 2800 },
  { month: 'Apr', streams: 890000, revenue: 3670 },
  { month: 'May', streams: 1200000, revenue: 4950 },
  { month: 'Jun', streams: 1650000, revenue: 6800 },
  { month: 'Jul', streams: 2100000, revenue: 8650 },
  { month: 'Aug', streams: 2700000, revenue: 11150 },
];

export function TrackCard({ theme = 'dark' }) {
  const [view, setView] = useState('streams');
  const isLight = theme === 'light';

  const cardBg = isLight ? '#ffffff' : '#000000';
  const cardBorder = isLight ? '#e2ddd5' : 'rgba(255, 255, 255, 0.05)';
  const panelBg = isLight ? '#f5f5f5' : '#0a0a0a';
  const panelBorder = isLight ? '#e5e5e5' : '#262626';
  const textPrimary = isLight ? '#111111' : '#f5f5f5';
  const textSecondary = isLight ? '#737373' : '#a3a3a3';
  const textMuted = isLight ? '#a3a3a3' : '#737373';
  const gridStroke = isLight ? '#e5e5e5' : '#262626';

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
        padding: '24px',
        boxShadow: isLight ? '0 2px 16px rgba(0, 0, 0, 0.06)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Toggle Switch */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          background: panelBg,
          border: `1px solid ${panelBorder}`,
          borderRadius: '8px',
          padding: '4px',
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => setView('streams')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: view === 'streams' ? '#22c55e' : 'transparent',
            color: view === 'streams' ? '#000000' : textSecondary,
          }}
        >
          Streams
        </button>
        <button
          onClick={() => setView('revenue')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: view === 'revenue' ? '#ef4444' : 'transparent',
            color: view === 'revenue' ? '#000000' : textSecondary,
          }}
        >
          Revenue
        </button>
      </div>

      {/* Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Line Chart */}
        <div
          style={{
            background: panelBg,
            border: `1px solid ${panelBorder}`,
            borderRadius: '8px',
            padding: '12px',
            height: '150px',
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={streamData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" stroke={textMuted} style={{ fontSize: '10px' }} />
              <YAxis
                stroke={view === 'streams' ? '#22c55e' : '#ef4444'}
                style={{ fontSize: '10px' }}
                tickFormatter={(value) =>
                  view === 'streams' ? `${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isLight ? '#ffffff' : '#0a0a0a',
                  border: `1px solid ${panelBorder}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: textPrimary,
                }}
                labelStyle={{ color: textSecondary }}
              />
              {view === 'streams' && (
                <Line
                  type="monotone"
                  dataKey="streams"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 3 }}
                  animationDuration={1500}
                />
              )}
              {view === 'revenue' && (
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 3 }}
                  animationDuration={1500}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div
            style={{
              background: panelBg,
              border: `1px solid ${panelBorder}`,
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '11px', color: textMuted, marginBottom: '3px' }}>Total Revenue</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: textPrimary }}>$272,868</div>
            <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '3px' }}>+18.2% this month</div>
          </div>
          <div
            style={{
              background: panelBg,
              border: `1px solid ${panelBorder}`,
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '11px', color: textMuted, marginBottom: '3px' }}>Total Plays</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: textPrimary }}>3.6B</div>
            <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '3px' }}>+12.5% this month</div>
          </div>
        </div>

        {/* Catalog Value */}
        <div
          style={{
            background: panelBg,
            border: `1px solid ${panelBorder}`,
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '11px', color: textMuted, marginBottom: '6px' }}>Catalog Value</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', color: textSecondary }}>Publishing</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: textPrimary }}>$240,922</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: textSecondary }}>Master</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: textPrimary }}>$29,673</div>
            </div>
          </div>
        </div>
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
