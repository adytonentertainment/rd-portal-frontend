/* eslint-disable prettier/prettier */
import { useState, useEffect } from 'react';
import { NivoLineChart } from '../../components/NivoLineChart';
import { transformToNivoFormat } from '../../utils/dataAggregation';
import styles from './ChartDemo.module.css';

/**
 * ChartDemo - Demo page showcasing the NivoLineChart component
 * This demonstrates how to use the Nivo line chart with TuneScan data
 */
const ChartDemo = () => {
  const [chartData, setChartData] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['spotify_playcount', 'youtube_playcount']);

  // Example data - In a real app, this would come from your API
  const sampleData = [
    {
      date: '2024-10-01',
      spotify_playcount: 1000,
      youtube_playcount: 500,
      master_royalty: 50,
      publishing_royalty: 25,
    },
    {
      date: '2024-10-02',
      spotify_playcount: 1200,
      youtube_playcount: 600,
      master_royalty: 60,
      publishing_royalty: 30,
    },
    {
      date: '2024-10-03',
      spotify_playcount: 1100,
      youtube_playcount: 550,
      master_royalty: 55,
      publishing_royalty: 27,
    },
    {
      date: '2024-10-04',
      spotify_playcount: 1400,
      youtube_playcount: 700,
      master_royalty: 70,
      publishing_royalty: 35,
    },
    {
      date: '2024-10-05',
      spotify_playcount: 1300,
      youtube_playcount: 650,
      master_royalty: 65,
      publishing_royalty: 32,
    },
    {
      date: '2024-10-06',
      spotify_playcount: 1600,
      youtube_playcount: 800,
      master_royalty: 80,
      publishing_royalty: 40,
    },
    {
      date: '2024-10-07',
      spotify_playcount: 1500,
      youtube_playcount: 750,
      master_royalty: 75,
      publishing_royalty: 37,
    },
  ];

  // Custom labels for the metrics
  const metricLabels = {
    spotify_playcount: 'Spotify',
    youtube_playcount: 'YouTube',
    master_royalty: 'Master Royalty',
    publishing_royalty: 'Publishing Royalty',
  };

  // Transform data when metrics change
  useEffect(() => {
    const nivoData = transformToNivoFormat(sampleData, selectedMetrics, metricLabels);
    setChartData(nivoData);
  }, [selectedMetrics]);

  const handleMetricToggle = (metric) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        return prev.filter((m) => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  const metrics = [
    { key: 'spotify_playcount', label: 'Spotify', color: '#1DB954' },
    { key: 'youtube_playcount', label: 'YouTube', color: '#FF0000' },
    { key: 'master_royalty', label: 'Master Royalty', color: '#fb923c' },
    {
      key: 'publishing_royalty',
      label: 'Publishing Royalty',
      color: '#8b5cf6',
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nivo Line Chart Demo</h1>
        <p className={styles.subtitle}>Interactive line chart with theme support and multiple data series</p>
      </div>

      <div className={styles.content}>
        {/* Metric Toggle Buttons */}
        <div className={styles.controls}>
          <h3 className={styles.controlsTitle}>Select Metrics:</h3>
          <div className={styles.buttonGroup}>
            {metrics.map((metric) => (
              <button
                key={metric.key}
                onClick={() => handleMetricToggle(metric.key)}
                className={`${styles.metricButton} ${selectedMetrics.includes(metric.key) ? styles.active : ''}`}
                style={{
                  borderColor: selectedMetrics.includes(metric.key) ? metric.color : 'var(--button-border)',
                }}
              >
                <span className={styles.colorIndicator} style={{ backgroundColor: metric.color }} />
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div className={styles.chartContainer}>
          <NivoLineChart
            data={chartData}
            height={500}
            xAxisLegend="Date"
            yAxisLegend="Count"
            enableLegend={true}
            enablePoints={true}
            enableArea={false}
            curve="monotoneX"
            colors={metrics.filter((m) => selectedMetrics.includes(m.key)).map((m) => m.color)}
          />
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <h3 className={styles.infoTitle}>How to Use</h3>
          <div className={styles.infoContent}>
            <div className={styles.infoBlock}>
              <h4>Basic Usage:</h4>
              <pre className={styles.codeBlock}>
                {`import { NivoLineChart } from '../../components/NivoLineChart';
import { transformToNivoFormat } from '../../utils/dataAggregation';

// Transform your data
const nivoData = transformToNivoFormat(
  data,
  ['spotify_playcount', 'youtube_playcount'],
  { spotify_playcount: 'Spotify', youtube_playcount: 'YouTube' }
);

// Render the chart
<NivoLineChart
  data={nivoData}
  height={400}
  xAxisLegend="Date"
  yAxisLegend="Streams"
/>`}
              </pre>
            </div>

            <div className={styles.infoBlock}>
              <h4>Data Format:</h4>
              <pre className={styles.codeBlock}>
                {`// Input data (TuneScan format):
[
  { date: '2024-10-01', spotify_playcount: 1000, youtube_playcount: 500 },
  { date: '2024-10-02', spotify_playcount: 1200, youtube_playcount: 600 }
]

// Output (Nivo format):
[
  {
    id: 'Spotify',
    data: [{ x: '2024-10-01', y: 1000 }, { x: '2024-10-02', y: 1200 }]
  },
  {
    id: 'YouTube',
    data: [{ x: '2024-10-01', y: 500 }, { x: '2024-10-02', y: 600 }]
  }
]`}
              </pre>
            </div>

            <div className={styles.infoBlock}>
              <h4>Available Props:</h4>
              <ul className={styles.propsList}>
                <li>
                  <code>data</code> - Array of series (required)
                </li>
                <li>
                  <code>height</code> - Chart height in pixels (default: 400)
                </li>
                <li>
                  <code>enableLegend</code> - Show/hide legend (default: true)
                </li>
                <li>
                  <code>enablePoints</code> - Show/hide data points (default: true)
                </li>
                <li>
                  <code>enableArea</code> - Fill area under lines (default: false)
                </li>
                <li>
                  <code>curve</code> - Line curve type (default: 'monotoneX')
                </li>
                <li>
                  <code>colors</code> - Custom color scheme
                </li>
                <li>
                  <code>xAxisLegend</code> - X-axis label
                </li>
                <li>
                  <code>yAxisLegend</code> - Y-axis label
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartDemo;
