import { Fragment, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from 'recharts';
import { FaTv, FaBroadcastTower, FaSpotify, FaYoutube, FaChartLine, FaHourglassHalf } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { getWriterPersonaId } from '../../utils/persona';
import { hasAnyDistribution, subscribe as subscribeDistribution, CURRENT_PERIOD } from '../../mocks/distributionState';
import '../Revenue/revenue.css';
import styles from './usage.module.css';

const SOURCES = {
  tv: { label: 'TV', color: '#c8102e', short: 'TV' },
  radio: { label: 'Radio / Broadcast', color: '#e63946', short: 'RAD' },
  youtube: { label: 'YouTube', color: '#ff0000', short: 'YT' },
  spotify: { label: 'Spotify', color: '#1db954', short: 'SPO' },
};

// Generate N days of mock usage data
const buildSeries = (days = 30) => {
  const today = new Date('2026-05-05');
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayIdx = days - 1 - i;
    const weekday = d.getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.45 : 1;

    // Broadcast monitoring — daily (small indie writer scale)
    const tvBase = Math.max(0, -0.2 + Math.sin(i / 4) * 0.6 + Math.random() * 0.7);
    const tv = Math.round(tvBase * weekendBoost);
    const radioBase = Math.max(0, 1 + Math.cos(i / 5) * 0.8 + Math.random() * 1.4);
    const radio = Math.round(radioBase * weekendBoost);

    // DSP — continuous daily Content-ID/fingerprint detections, with a modest bump on full-scan days.
    const isYtScanDay = dayIdx % 14 === 4;
    const isSpScanDay = dayIdx % 14 === 9;
    const youtubeBase = Math.max(0, 1 + Math.sin(i / 3) * 0.8 + Math.random() * 1.2);
    const youtube = Math.round(youtubeBase + (isYtScanDay ? 4 + Math.random() * 3 : 0));
    const spotifyBase = Math.max(0, 1.6 + Math.cos(i / 3.5) * 1 + Math.random() * 1.6);
    const spotify = Math.round(spotifyBase + (isSpScanDay ? 5 + Math.random() * 4 : 0));

    series.push({
      day: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      iso: d.toISOString().slice(0, 10),
      tv,
      radio,
      youtube,
      spotify,
      total: tv + radio + youtube + spotify,
    });
  }
  return series;
};

const detections = [
  { source: 'radio', title: 'Coastline Drive', sub: 'WXRT 93.1 FM · Chicago', time: '4h ago' },
  { source: 'tv', title: 'Lantern Light', sub: 'BBC One — "The Late Show" · London', time: '6h ago' },
  { source: 'radio', title: 'Slow Tide', sub: 'Radio FIP · Paris', time: '8h ago' },
  { source: 'radio', title: 'Lantern Light', sub: 'Triple J · Sydney', time: '1d ago' },
  { source: 'youtube', title: 'Lantern Light', sub: 'YouTube · 2 channels · ~1,400 views', time: '1d ago' },
  { source: 'spotify', title: 'Hours Like These', sub: 'Spotify · 612 streams (Q1 scan)', time: '2d ago' },
  { source: 'youtube', title: 'Coastline Drive', sub: 'YouTube · 1 channel · ~480 views', time: '2d ago' },
  { source: 'spotify', title: 'Lantern Light', sub: 'Spotify · 284 streams (Q1 scan)', time: '2d ago' },
  { source: 'tv', title: 'Hours Like These', sub: 'France 2 — "C à vous" · Paris', time: '3d ago' },
];

const fmtNum = (n) => n.toLocaleString();

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const get = (k) => payload.find((p) => p.dataKey === k)?.value || 0;
  const rows = [
    { key: 'tv', label: 'TV' },
    { key: 'radio', label: 'Radio' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'spotify', label: 'Spotify' },
  ];
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        padding: '10px 12px',
        borderRadius: 8,
        fontSize: 12,
        boxShadow: 'var(--shadow-md)',
        minWidth: 200,
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div style={{ color: 'var(--soft-text)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, columnGap: 12 }}>
        {rows.map((r) => (
          <Fragment key={r.key}>
            <span style={{ color: 'var(--text)' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  background: SOURCES[r.key].color,
                  borderRadius: 2,
                  marginRight: 6,
                }}
              />
              {r.label}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtNum(get(r.key))}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const Usage = () => {
  const [range, setRange] = useState(30);
  const data = useMemo(() => buildSeries(range), [range]);

  // Demo: gate the writer-facing portal on distribution. Keyed on the active
  // persona — usage monitoring appears only once the publisher has clicked
  // Distribute. Uploading statements alone never reveals it.
  const writerPersonaId = getWriterPersonaId();
  const [, forceTick] = useState(0);
  useEffect(() => subscribeDistribution(() => forceTick((x) => x + 1)), []);
  const writerHasNoDistributions = writerPersonaId != null && !hasAnyDistribution(writerPersonaId);

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, d) => {
          acc.tv += d.tv;
          acc.radio += d.radio;
          acc.youtube += d.youtube;
          acc.spotify += d.spotify;
          acc.total += d.total;
          return acc;
        },
        { tv: 0, radio: 0, youtube: 0, spotify: 0, total: 0 }
      ),
    [data]
  );

  const sourceMax = Math.max(totals.tv, totals.radio, totals.youtube, totals.spotify, 1);

  if (writerHasNoDistributions) {
    return (
      <>
        <Helmet>
          <title>Usage | RD</title>
        </Helmet>
        <div className="revenue-page">
          <div className="revenue-background"></div>
          <Sidebar />
          <div className="revenue-content">
            <div className="revenue-header">
              <div>
                <h1 className="revenue-title">Usage</h1>
                <p className="revenue-subtitle">Real-time monitoring across TV, broadcast and DSPs</p>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '64px 24px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                color: 'var(--soft-text)',
              }}
            >
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  No usage data yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 480 }}>
                  Usage monitoring appears here once your publisher distributes your {CURRENT_PERIOD} statement. Until
                  then there is nothing to show.
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Usage | RD</title>
      </Helmet>
      <div className="revenue-page">
        <div className="revenue-background"></div>
        <Sidebar />
        <div className="revenue-content">
          <div className="revenue-header">
            <div>
              <h1 className="revenue-title">Usage</h1>
              <p className="revenue-subtitle">Real-time monitoring across TV, broadcast and DSPs</p>
            </div>
            <div className="header-controls">
              <span className={styles.livePill}>
                <span className={styles.liveDot} />
                Daily monitoring active
              </span>
              <div className={styles.rangeTabs}>
                {[14, 30, 60].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`${styles.rangeTab} ${range === r ? styles.active : ''}`}
                    onClick={() => setRange(r)}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-icon" style={{ background: 'rgba(26, 26, 26, 0.08)' }}>
                <FaChartLine style={{ color: 'var(--text)' }} />
              </div>
              <div className="summary-content">
                <div className="summary-label">Total · {range}d</div>
                <div className="summary-value">{fmtNum(totals.total)}</div>
                <div className="summary-change">All sources combined</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon" style={{ background: `${SOURCES.tv.color}15` }}>
                <FaTv style={{ color: SOURCES.tv.color }} />
              </div>
              <div className="summary-content">
                <div className="summary-label">TV</div>
                <div className="summary-value">{fmtNum(totals.tv)}</div>
                <div className="summary-change">Broadcast monitoring · daily</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon" style={{ background: `${SOURCES.radio.color}15` }}>
                <FaBroadcastTower style={{ color: SOURCES.radio.color }} />
              </div>
              <div className="summary-content">
                <div className="summary-label">Radio</div>
                <div className="summary-value">{fmtNum(totals.radio)}</div>
                <div className="summary-change">Broadcast monitoring · daily</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon" style={{ background: `${SOURCES.youtube.color}15` }}>
                <FaYoutube style={{ color: SOURCES.youtube.color }} />
              </div>
              <div className="summary-content">
                <div className="summary-label">YouTube</div>
                <div className="summary-value">{fmtNum(totals.youtube)}</div>
                <div className="summary-change">Content ID · every 14d</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon" style={{ background: `${SOURCES.spotify.color}15` }}>
                <FaSpotify style={{ color: SOURCES.spotify.color }} />
              </div>
              <div className="summary-content">
                <div className="summary-label">Spotify</div>
                <div className="summary-value">{fmtNum(totals.spotify)}</div>
                <div className="summary-change">Fingerprint · every 14d</div>
              </div>
            </div>
          </div>

          <div className="chart-card" style={{ marginBottom: 20 }}>
            <div className="chart-header">
              <h3>Daily detections</h3>
              <p style={{ margin: 0, color: 'var(--soft-text)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                TV and radio refreshed every 24 hours. DSP detections discovered continuously via fingerprinting.
              </p>
            </div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--graph-grid)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--graph-text)"
                    tick={{ fontSize: 10, fill: 'var(--graph-text)' }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(range / 10))}
                  />
                  <YAxis
                    stroke="var(--graph-text)"
                    tick={{ fontSize: 10, fill: 'var(--graph-text)' }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <ReTooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="tv"
                    stroke={SOURCES.tv.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="radio"
                    stroke={SOURCES.radio.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="youtube"
                    stroke={SOURCES.youtube.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spotify"
                    stroke={SOURCES.spotify.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: SOURCES.tv.color }} />
                TV
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: SOURCES.radio.color }} />
                Radio
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: SOURCES.youtube.color }} />
                YouTube
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: SOURCES.spotify.color }} />
                Spotify
              </span>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h3>Recent detections</h3>
              </div>
              <ul className={styles.detectionList}>
                {detections.map((d, i) => {
                  const s = SOURCES[d.source];
                  return (
                    <li key={i} className={styles.detectionItem}>
                      <span className={styles.sourceIcon} style={{ background: s.color }}>
                        {s.short}
                      </span>
                      <div className={styles.detectionMeta}>
                        <span className={styles.detectionTitle}>{d.title}</span>
                        <span className={styles.detectionSub}>{d.sub}</span>
                      </div>
                      <span className={styles.detectionTime}>{d.time}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3>By source</h3>
              </div>
              <ul className={styles.sourceList}>
                {[
                  { key: 'tv', count: totals.tv },
                  { key: 'radio', count: totals.radio },
                  { key: 'youtube', count: totals.youtube },
                  { key: 'spotify', count: totals.spotify },
                ].map(({ key, count }) => {
                  const s = SOURCES[key];
                  const pct = (count / sourceMax) * 100;
                  return (
                    <li key={key} className={styles.sourceRow}>
                      <span className={styles.sourceLabel}>
                        <span className={styles.sourceTag} style={{ background: s.color }}>
                          {s.short}
                        </span>
                        {s.label}
                      </span>
                      <span className={styles.sourceCount}>{fmtNum(count)}</span>
                      <span className={styles.sourceBar}>
                        <span className={styles.sourceBarFill} style={{ width: `${pct}%`, background: s.color }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Usage;
