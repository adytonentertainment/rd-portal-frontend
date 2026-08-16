import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const platformData = [
  { name: 'Spotify', value: 8420, color: '#1DB954' },
  { name: 'Apple Music', value: 6210, color: '#FA243C' },
  { name: 'YouTube', value: 4120, color: '#FF0000' },
  { name: 'Other', value: 3402, color: '#6B7280' },
];

const revenueData = [
  { month: 'Q1', reported: 4050, discrepancy: 300, payout: 4050 },
  { month: 'Q2', reported: 4700, discrepancy: 400, payout: 4700 },
  { month: 'Q3', reported: 6800, discrepancy: 0, payout: 6800 },
  { month: 'Q4', reported: 5200, discrepancy: 600, payout: 5200 },
];

const territoryData = [
  { country: 'United States', amount: '$8,340' },
  { country: 'Canada', amount: '$3,214' },
  { country: 'United Kingdom', amount: '$2,650' },
  { country: 'Germany', amount: '$1,891' },
];

export function EarningsCard({ theme = 'dark' }) {
  const [view, setView] = useState(0);
  const isLight = theme === 'light';

  const cardBg = isLight ? '#f5f5f5' : '#0a0a0a';
  const cardBorder = isLight ? '#e2ddd5' : 'rgba(255, 255, 255, 0.05)';
  const headerBg = isLight ? '#ffffff' : '#000000';
  const headerBorder = isLight ? '#e5e5e5' : '#262626';
  const textPrimary = isLight ? '#111111' : '#f5f5f5';
  const textSecondary = isLight ? '#525252' : '#a3a3a3';
  const panelBg = isLight ? '#ffffff' : '#111111';
  const panelBorder = isLight ? '#e5e5e5' : '#262626';
  const gridStroke = isLight ? '#e5e5e5' : '#262626';
  const axisTick = isLight ? '#737373' : '#737373';
  const axisStroke = isLight ? '#d4d4d4' : '#404040';
  const dotActive = isLight ? '#111111' : '#ffffff';
  const dotInactive = isLight ? '#d4d4d4' : '#404040';

  // Earnings banner
  const bannerBg = isLight
    ? 'linear-gradient(to bottom right, #f0fdf4, #ecfdf5)'
    : 'linear-gradient(to bottom right, rgba(34,197,94,0.08), rgba(16,185,129,0.06))';
  const bannerBorder = isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.2)';

  // Territory summary
  const summaryBg = isLight
    ? 'linear-gradient(to bottom right, #eff6ff, #eef2ff)'
    : 'linear-gradient(to bottom right, rgba(59,130,246,0.08), rgba(99,102,241,0.06))';
  const summaryBorder = isLight ? '#bfdbfe' : 'rgba(59,130,246,0.2)';

  // Legend
  const legendText = isLight ? '#404040' : '#a3a3a3';

  useEffect(() => {
    const timer = setInterval(() => {
      setView((prev) => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: headerBg,
          borderBottom: `1px solid ${headerBorder}`,
          padding: '12px 16px',
          flexShrink: 0,
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: textPrimary, margin: '0 0 2px 0' }}>Earnings</h2>
        <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
          Track income across platforms and territories
        </p>

        {/* Total Earnings */}
        <div
          style={{
            marginTop: '8px',
            background: bannerBg,
            border: `1px solid ${bannerBorder}`,
            borderRadius: '8px',
            padding: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: textSecondary, marginBottom: '1px' }}>TOTAL EARNINGS</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: textPrimary }}>$22,152.25</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                <TrendingUp style={{ height: '11px', width: '11px', color: '#16a34a' }} />
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>3.2% UP from last period</span>
              </div>
            </div>
            <div
              style={{
                background: '#22c55e',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign style={{ height: '16px', width: '16px', color: '#ffffff' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 16px' }}>
        <AnimatePresence mode="wait">
          {/* View 1: Platform Breakdown */}
          {view === 0 && (
            <motion.div
              key="platforms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, margin: '0 0 8px 0' }}>
                Revenue by Platform
              </h3>

              {/* Donut Chart */}
              <div
                style={{
                  background: panelBg,
                  border: `1px solid ${panelBorder}`,
                  borderRadius: '8px',
                  padding: '8px',
                  marginBottom: '8px',
                }}
              >
                <ResponsiveContainer width="100%" height={90}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={42}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Platform List - 2x2 Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {platformData.map((platform, index) => (
                  <motion.div
                    key={platform.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: panelBg,
                      border: `1px solid ${panelBorder}`,
                      borderRadius: '6px',
                      padding: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: platform.color,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '11px',
                          color: textSecondary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {platform.name}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                        ${platform.value.toLocaleString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* View 2: Revenue Over Time */}
          {view === 1 && (
            <motion.div
              key="revenue"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, margin: '0 0 8px 0' }}>
                Revenue Over Time
              </h3>

              {/* Bar Chart */}
              <div
                style={{
                  background: panelBg,
                  border: `1px solid ${panelBorder}`,
                  borderRadius: '8px',
                  padding: '8px',
                  marginBottom: '8px',
                }}
              >
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="month" tick={{ fill: axisTick, fontSize: 9 }} stroke={axisStroke} />
                    <YAxis
                      tick={{ fill: axisTick, fontSize: 9 }}
                      stroke={axisStroke}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Bar dataKey="reported" stackId="stack" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="discrepancy" stackId="stack" fill="url(#blueStripes)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payout" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <defs>
                      <pattern
                        id="blueStripes"
                        patternUnits="userSpaceOnUse"
                        width="8"
                        height="8"
                        patternTransform="rotate(45)"
                      >
                        <rect width="4" height="8" fill="#3B82F6" />
                        <rect x="4" width="4" height="8" fill="#93C5FD" />
                      </pattern>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginTop: '4px',
                    fontSize: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3B82F6' }} />
                    <span style={{ color: legendText }}>Reported</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '2px',
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #3B82F6 0, #3B82F6 2px, #93C5FD 2px, #93C5FD 4px)',
                      }}
                    />
                    <span style={{ color: legendText }}>Discrepancy</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444' }} />
                    <span style={{ color: legendText }}>Payout</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div
                  style={{
                    background: panelBg,
                    border: `1px solid ${panelBorder}`,
                    borderRadius: '6px',
                    padding: '6px 8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: textSecondary }}>Reported Total</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: textPrimary }}>$22,000</div>
                </div>
                <div
                  style={{
                    background: panelBg,
                    border: `1px solid ${panelBorder}`,
                    borderRadius: '6px',
                    padding: '6px 8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: textSecondary }}>Total Payout</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>$21,300</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* View 3: Territory Breakdown */}
          {view === 2 && (
            <motion.div
              key="territory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Globe style={{ height: '14px', width: '14px', color: textSecondary }} />
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, margin: 0 }}>
                  Top Countries by Revenue
                </h3>
              </div>

              {/* Territory List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                {territoryData.map((territory, index) => (
                  <motion.div
                    key={territory.country}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: panelBg,
                      border: `1px solid ${panelBorder}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'linear-gradient(to bottom right, #60a5fa, #2563eb)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: textPrimary }}>{territory.country}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>{territory.amount}</span>
                  </motion.div>
                ))}
              </div>

              {/* Summary Card */}
              <div
                style={{
                  background: summaryBg,
                  border: `1px solid ${summaryBorder}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontSize: '11px', color: textSecondary, marginBottom: '1px' }}>GLOBAL COVERAGE</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: textPrimary, marginBottom: '1px' }}>
                  89 territories
                </div>
                <div style={{ fontSize: '11px', color: textSecondary }}>Income distribution across 6 continents</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step indicators */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 0',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ height: '6px', borderRadius: '9999px' }}
            animate={{
              width: view === i ? 24 : 8,
              backgroundColor: view === i ? dotActive : dotInactive,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {/* Decorative corner accent */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          height: '128px',
          width: '128px',
          borderBottomLeftRadius: '100%',
          background: isLight
            ? 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.06), transparent)'
            : 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.1), transparent)',
        }}
      />
    </motion.div>
  );
}
