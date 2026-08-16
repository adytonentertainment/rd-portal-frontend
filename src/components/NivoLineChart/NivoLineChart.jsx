/* eslint-disable prettier/prettier */
import { ResponsiveLine } from '@nivo/line';
import { useContext, useMemo } from 'react';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';

/**
 * NivoLineChart - A themed line chart component using Nivo
 *
 * @param {Array} data - Array of data series in Nivo format:
 *   [
 *     {
 *       id: 'spotify',
 *       data: [{ x: '2024-01-01', y: 1000 }, { x: '2024-01-02', y: 1200 }]
 *     },
 *     {
 *       id: 'youtube',
 *       data: [{ x: '2024-01-01', y: 500 }, { x: '2024-01-02', y: 600 }]
 *     }
 *   ]
 * @param {Object} config - Chart configuration options
 */
export const NivoLineChart = ({
  data = [],
  config = {},
  height = 400,
  granularity = 'daily',
  enableLegend = true,
  enableGridX = true,
  enableGridY = true,
  enablePoints = true,
  pointSize = 10,
  enableArea = false,
  curve = 'monotoneX',
  colors = null,
  xAxisLegend = 'Date',
  yAxisLegend = 'Value',
  ...restProps
}) => {
  const { currentTheme } = useContext(ThemeContext);
  const isDarkMode = currentTheme === 'dark';

  // Theme-aware color scheme
  const theme = useMemo(
    () => ({
      background: 'transparent',
      text: {
        fill: isDarkMode ? '#e8e8e8' : '#111111',
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
      },
      axis: {
        domain: {
          line: {
            stroke: isDarkMode ? '#1e1e1e' : '#e2ddd5',
            strokeWidth: 1,
          },
        },
        ticks: {
          line: {
            stroke: isDarkMode ? '#1e1e1e' : '#e2ddd5',
            strokeWidth: 1,
          },
          text: {
            fill: isDarkMode ? '#888888' : '#6b6b6b',
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
          },
        },
        legend: {
          text: {
            fill: isDarkMode ? '#e8e8e8' : '#111111',
            fontSize: 11,
            fontWeight: 500,
            fontFamily: "'DM Mono', monospace",
          },
        },
      },
      grid: {
        line: {
          stroke: isDarkMode ? '#1e1e1e' : '#e2ddd5',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
      },
      legends: {
        text: {
          fill: isDarkMode ? '#e8e8e8' : '#111111',
          fontSize: 11,
          fontFamily: "'DM Sans', sans-serif",
        },
      },
      tooltip: {
        container: {
          background: isDarkMode ? '#141414' : '#ffffff',
          color: isDarkMode ? '#e8e8e8' : '#111111',
          fontSize: 12,
          fontFamily: "'DM Mono', monospace",
          borderRadius: '8px',
          boxShadow: 'none',
          border: `1px solid ${isDarkMode ? '#1e1e1e' : '#e2ddd5'}`,
        },
      },
      crosshair: {
        line: {
          stroke: isDarkMode ? '#888888' : '#6b6b6b',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
      },
    }),
    [isDarkMode]
  );

  // Default color scheme (can be overridden via colors prop)
  const defaultColors = useMemo(() => {
    if (colors) return colors;
    return isDarkMode
      ? ['#c8ff00', '#a3d900', '#7fb300', '#5c8c00', '#4ade80', '#fbbf24']
      : ['#111111', '#444444', '#888888', '#bbbbbb', '#22c55e', '#f59e0b'];
  }, [isDarkMode, colors]);

  // Legend configuration
  const legendConfig = enableLegend
    ? [
        {
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 100,
          translateY: 0,
          itemsSpacing: 0,
          itemDirection: 'left-to-right',
          itemWidth: 80,
          itemHeight: 22,
          itemOpacity: 0.85,
          symbolSize: 12,
          symbolShape: 'circle',
          symbolBorderColor: 'rgba(0, 0, 0, .5)',
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: isDarkMode ? 'rgba(255, 255, 255, .03)' : 'rgba(0, 0, 0, .03)',
                itemOpacity: 1,
              },
            },
          ],
        },
      ]
    : [];

  // Calculate smart tick values based on granularity and data length
  const tickValues = useMemo(() => {
    if (!data || !data[0] || !data[0].data || data[0].data.length === 0) {
      return undefined;
    }

    const dataPoints = data[0].data;
    const totalPoints = dataPoints.length;

    // Determine tick interval based on granularity
    let tickInterval;

    switch (granularity) {
      case 'daily':
        // For daily data, adjust based on total range
        if (totalPoints <= 7) {
          tickInterval = 1; // Show all days for week view
        } else if (totalPoints <= 14) {
          tickInterval = 2; // Every 2 days for 2 weeks
        } else if (totalPoints <= 30) {
          tickInterval = 5; // Every 5 days for month view
        } else if (totalPoints <= 60) {
          tickInterval = 7; // Weekly ticks for 2 months
        } else {
          tickInterval = Math.ceil(totalPoints / 10); // ~10 ticks max
        }
        break;

      case 'weekly':
        // For weekly data, show every week or every 2 weeks
        if (totalPoints <= 8) {
          tickInterval = 1; // Show all weeks for up to 2 months
        } else if (totalPoints <= 16) {
          tickInterval = 2; // Every 2 weeks for up to 4 months
        } else {
          tickInterval = Math.ceil(totalPoints / 8); // ~8 ticks max
        }
        break;

      case 'monthly':
        // For monthly data, show every month or every 3 months
        if (totalPoints <= 12) {
          tickInterval = 1; // Show all months for up to 1 year
        } else if (totalPoints <= 24) {
          tickInterval = 2; // Every 2 months for up to 2 years
        } else {
          tickInterval = 3; // Quarterly ticks for longer periods
        }
        break;

      case 'quarterly':
        // For quarterly data, show all quarters
        tickInterval = 1;
        break;

      default:
        // Fallback to data-point-count heuristic
        if (totalPoints > 180) {
          tickInterval = Math.floor(totalPoints / 8);
        } else if (totalPoints > 60) {
          tickInterval = Math.floor(totalPoints / 10);
        } else if (totalPoints > 30) {
          tickInterval = Math.floor(totalPoints / 12);
        } else {
          tickInterval = Math.max(1, Math.floor(totalPoints / 15));
        }
    }

    // Ensure tickInterval is at least 1
    tickInterval = Math.max(1, tickInterval);

    // Select every nth point
    const ticks = [];
    for (let i = 0; i < totalPoints; i += tickInterval) {
      ticks.push(dataPoints[i].x);
    }

    // Always include the last point if not already included
    const lastPoint = dataPoints[totalPoints - 1].x;
    if (ticks[ticks.length - 1] !== lastPoint) {
      ticks.push(lastPoint);
    }

    return ticks;
  }, [data, granularity]);

  // Calculate dynamic Y-axis scale based on actual data range
  const yScale = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        type: 'linear',
        min: 0,
        max: 100,
        stacked: config.stacked || false,
        reverse: false,
      };
    }

    // Find min and max values across all series
    let minValue = Infinity;
    let maxValue = -Infinity;
    const allValues = [];

    data.forEach((series) => {
      if (!series.data || series.data.length === 0) return;
      series.data.forEach((point) => {
        if (typeof point.y === 'number' && !isNaN(point.y)) {
          allValues.push(point.y);
          if (point.y < minValue) minValue = point.y;
          if (point.y > maxValue) maxValue = point.y;
        }
      });
    });

    // Guard against empty or invalid data
    if (allValues.length === 0 || minValue === Infinity || maxValue === -Infinity) {
      return {
        type: 'linear',
        min: 0,
        max: 100,
        stacked: config.stacked || false,
        reverse: false,
      };
    }

    const range = maxValue - minValue;
    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    // EXTREME TIGHT SCALING: Detect micro-variations
    // Guard against division by zero or NaN
    const variationRatio = mean !== 0 && !isNaN(mean) ? range / mean : 1;

    // Helper to safely return scale with valid values
    const safeScale = (min, max) => {
      const safeMin = isFinite(min) ? min : 0;
      const safeMax = isFinite(max) && max > safeMin ? max : safeMin + 100;
      return {
        type: 'linear',
        min: safeMin,
        max: safeMax,
        stacked: config.stacked || false,
        reverse: false,
      };
    };

    // If data is completely flat (no variation at all)
    if (range === 0 || isNaN(range)) {
      const artificialRange = mean * 0.001 || 1; // 0.1% of mean or 1
      return safeScale(Math.max(0, minValue - artificialRange), minValue + artificialRange);
    }

    // AGGRESSIVE: For micro-variations (< 1% of mean), use ultra-tight bounds
    if (variationRatio < 0.01) {
      const ultraTightPadding = range * 0.05; // Only 5% padding
      const finalMin = Math.max(0, minValue - ultraTightPadding);
      const finalMax = maxValue + ultraTightPadding;
      return safeScale(finalMin, finalMax);
    }

    // VERY AGGRESSIVE: For small variations (< 5% of mean), use very tight bounds
    if (variationRatio < 0.05) {
      const veryTightPadding = range * 0.1; // Only 10% padding
      const finalMin = Math.max(0, minValue - veryTightPadding);
      const finalMax = maxValue + veryTightPadding;
      return safeScale(finalMin, finalMax);
    }

    // AGGRESSIVE: For moderate variations (< 10% of mean), use tight bounds
    if (variationRatio < 0.1) {
      const tightPadding = range * 0.15; // 15% padding
      const finalMin = Math.max(0, minValue - tightPadding);
      const finalMax = maxValue + tightPadding;
      return safeScale(finalMin, finalMax);
    }

    // Normal scaling for large variations (>= 10% of mean)
    const normalPadding = range * 0.2; // 20% padding
    const useNonZeroMin = minValue > range * 0.2;
    const finalMin = useNonZeroMin ? Math.max(0, minValue - normalPadding) : 0;
    const finalMax = maxValue + normalPadding;
    return safeScale(finalMin, finalMax);
  }, [data, config.stacked]);

  // Custom tooltip component
  const CustomTooltip = ({ point }) => {
    const date = new Date(point.data.x);

    // Format date based on granularity for clearer context
    let formattedDate;
    switch (granularity) {
      case 'quarterly': {
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        formattedDate = `Q${quarter} ${date.getFullYear()}`;
        break;
      }
      case 'monthly':
        formattedDate = date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
        break;
      case 'weekly':
        formattedDate = `Week of ${date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
        break;
      case 'daily':
      default:
        formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
    }

    // Format the value with dots as thousand separators
    const rawValue = point.data.y;
    let formattedValue;

    // Check if the value is a revenue value (contains $ or is from Revenue axis)
    const isRevenue = yAxisLegend.includes('Revenue') || yAxisLegend.includes('$');

    if (isRevenue) {
      // For revenue, format as currency with dots
      formattedValue = '$' + rawValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    } else {
      // For streams, format as integer with dots
      formattedValue = Math.round(rawValue)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    return (
      <div
        style={{
          background: isDarkMode ? '#1f2937' : '#ffffff',
          color: isDarkMode ? '#e5e7eb' : '#1f2937',
          padding: '0.8rem',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{point.seriesId}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
            <span
              style={{
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                fontWeight: '700',
              }}
            >
              Date:
            </span>
            <br />
            <span style={{ fontWeight: '500' }}>{formattedDate}</span>
          </div>
          <div style={{ fontSize: '12px' }}>
            <span
              style={{
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                fontWeight: '700',
              }}
            >
              {yAxisLegend}:
            </span>
            <br />
            <span style={{ fontWeight: '500' }}>{formattedValue}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveLine
        data={data}
        theme={theme}
        colors={defaultColors}
        margin={{ top: 20, right: 20, bottom: 50, left: 80 }}
        xScale={{ type: 'point' }}
        yScale={yScale}
        curve={curve}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: xAxisLegend,
          legendOffset: 36,
          legendPosition: 'middle',
          tickValues: tickValues,
          format: (value) => {
            const date = new Date(value);

            // Format based on granularity
            switch (granularity) {
              case 'quarterly': {
                // Format as "Q1 2024"
                const quarter = Math.ceil((date.getMonth() + 1) / 3);
                return `Q${quarter} ${date.getFullYear()}`;
              }

              case 'monthly':
                // Format as "Jan 2024"
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                });

              case 'weekly':
                // Format as "Jan 15" (week start date)
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });

              case 'daily':
              default:
                // Format as "Jan 15"
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
            }
          },
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: yAxisLegend,
          legendOffset: -65,
          legendPosition: 'middle',
          format: (value) => {
            // Format large numbers with K, M, B suffixes
            if (value >= 1000000000) {
              return (value / 1000000000).toFixed(1) + 'B';
            } else if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            } else if (value >= 1) {
              return value.toFixed(0);
            } else {
              // For values less than 1 (like small revenue), show 2 decimal places
              return value.toFixed(2);
            }
          },
        }}
        enableGridX={true}
        gridXValues={tickValues}
        enableGridY={enableGridY}
        gridYValues={5}
        pointSize={6}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'seriesColor' }}
        pointLabelYOffset={-12}
        enableArea={enableArea}
        areaOpacity={0.1}
        useMesh={true}
        enableTouchCrosshair={true}
        enableCrosshair={true}
        legends={legendConfig}
        animate={false}
        tooltip={CustomTooltip}
        {...restProps}
      />
    </div>
  );
};

export default NivoLineChart;
