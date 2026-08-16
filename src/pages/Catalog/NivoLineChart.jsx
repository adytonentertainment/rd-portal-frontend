import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';

const NivoLineChart = ({
  detailedStats,
  chartViewMode,
  selectedStreamingServices,
  selectedRevenueTypes,
  currentTheme,
  chartHeight,
  granularity = 'daily',
}) => {
  // Calculate tick values and date format based on granularity and data density
  const { tickValues, dateFormat } = useMemo(() => {
    if (!detailedStats?.total?.length) {
      return { tickValues: undefined, dateFormat: '%b %d' };
    }

    const dataPoints = detailedStats.total;
    const dataCount = dataPoints.length;

    // Extract dates from the aggregated data (period start dates)
    const dates = dataPoints.map((d) => new Date(d.date_added));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Determine format based on granularity
    let format;
    switch (granularity) {
      case 'monthly':
      case 'quarterly':
        format = '%b %Y';
        break;
      case 'weekly':
        format = '%b %d';
        break;
      case 'daily':
      default:
        format = '%b %d';
        break;
    }

    // Calculate optimal tick count based on data density
    // Aim for roughly 6-12 ticks for readability
    const maxTicks = 12;
    const minTicks = 4;
    const targetTicks = Math.min(maxTicks, Math.max(minTicks, Math.floor(dataCount / 2)));

    let ticks;

    if (granularity === 'monthly' || granularity === 'quarterly') {
      // For monthly/quarterly: show ticks at month boundaries
      const monthTicks = [];
      const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

      while (current <= maxDate) {
        monthTicks.push(current.toISOString().split('T')[0]);
        current.setMonth(current.getMonth() + 1);
      }

      // If too many months, skip some to maintain readability
      if (monthTicks.length > maxTicks) {
        const skipFactor = Math.ceil(monthTicks.length / maxTicks);
        ticks = monthTicks.filter((_, i) => i % skipFactor === 0);
      } else {
        ticks = monthTicks;
      }
    } else if (granularity === 'weekly') {
      // For weekly: show ticks at week boundaries based on data density
      if (dataCount <= maxTicks) {
        // Show all data points as ticks
        ticks = dataPoints.map((d) => d.date_added.substring(0, 10));
      } else {
        // Skip some weeks to maintain readability
        const skipFactor = Math.ceil(dataCount / targetTicks);
        ticks = dataPoints
          .filter((_, i) => i % skipFactor === 0)
          .map((d) => d.date_added.substring(0, 10));
      }
    } else {
      // For daily: compute ticks based on total day span
      const daySpan = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

      if (daySpan <= 7) {
        // Show every day for short spans
        ticks = undefined; // Let Nivo auto-generate
      } else if (daySpan <= 30) {
        // Show every 5 days
        const dayTicks = [];
        const current = new Date(minDate);
        while (current <= maxDate) {
          dayTicks.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 5);
        }
        ticks = dayTicks;
      } else if (daySpan <= 90) {
        // Show weekly ticks
        const weekTicks = [];
        const current = new Date(minDate);
        while (current <= maxDate) {
          weekTicks.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 7);
        }
        ticks = weekTicks;
      } else {
        // Show monthly ticks for longer spans
        const monthTicks = [];
        const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        while (current <= maxDate) {
          monthTicks.push(current.toISOString().split('T')[0]);
          current.setMonth(current.getMonth() + 1);
        }
        // Skip if too many
        if (monthTicks.length > maxTicks) {
          const skipFactor = Math.ceil(monthTicks.length / maxTicks);
          ticks = monthTicks.filter((_, i) => i % skipFactor === 0);
        } else {
          ticks = monthTicks;
        }
        format = '%b %Y'; // Override format for long daily spans
      }
    }

    return { tickValues: ticks, dateFormat: format };
  }, [detailedStats, granularity]);

  // Transform data for Nivo format
  const transformedData = () => {
    const series = [];

    if (chartViewMode === 'streams') {
      // Add Spotify series if selected
      if (selectedStreamingServices.includes('Spotify')) {
        series.push({
          id: 'Spotify Streams',
          color: '#1DB954',
          data: detailedStats.total.map((entry) => ({
            x: entry.date_added.substring(0, 10), // Format as YYYY-MM-DD
            y: entry.spotify_playcount || 0,
          })),
        });
      }

      // Add YouTube series if selected
      if (selectedStreamingServices.includes('YouTube')) {
        series.push({
          id: 'YouTube Views',
          color: '#FF0000',
          data: detailedStats.total.map((entry) => ({
            x: entry.date_added.substring(0, 10),
            y: entry.youtube_playcount || 0,
          })),
        });
      }
    } else if (chartViewMode === 'revenue') {
      // Add Master royalties if selected
      if (selectedRevenueTypes.includes('Master')) {
        series.push({
          id: 'Master Royalties',
          color: '#fb923c', // orange-400 to match catalog percentage
          data: detailedStats.total.map((entry) => ({
            x: entry.date_added.substring(0, 10),
            y: entry.master_royalty || 0,
          })),
        });
      }

      // Add Publishing royalties if selected
      if (selectedRevenueTypes.includes('Publishing')) {
        series.push({
          id: 'Publishing Royalties',
          color: '#2dd4bf', // teal-400 to match catalog percentage
          data: detailedStats.total.map((entry) => ({
            x: entry.date_added.substring(0, 10),
            y: entry.publishing_royalty || 0,
          })),
        });
      }
    }

    return series;
  };

  const data = transformedData();

  // Return null if no data to display
  if (data.length === 0) {
    return (
      <div
        style={{
          height: chartHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
        }}
      >
        No data to display
      </div>
    );
  }

  // Determine if we need dual axes (for streams mode with both services)
  const needsDualAxes =
    chartViewMode === 'streams' &&
    selectedStreamingServices.includes('Spotify') &&
    selectedStreamingServices.includes('YouTube');

  // Get axis configuration based on mode
  const getAxisLeft = () => {
    if (chartViewMode === 'streams') {
      return {
        orient: 'left',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: needsDualAxes
          ? 'Spotify Streams'
          : selectedStreamingServices.includes('Spotify')
            ? 'Spotify Streams'
            : 'YouTube Views',
        legendOffset: -60,
        legendPosition: 'middle',
        format: (value) => {
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
          } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
          }
          return value.toLocaleString();
        },
      };
    } else {
      // Revenue mode
      return {
        orient: 'left',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Revenue ($)',
        legendOffset: -60,
        legendPosition: 'middle',
        format: (value) => `$${value.toFixed(2)}`,
      };
    }
  };

  const getAxisRight = () => {
    if (needsDualAxes) {
      return {
        orient: 'right',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'YouTube Views',
        legendOffset: 60,
        legendPosition: 'middle',
        format: (value) => {
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
          } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
          }
          return value.toLocaleString();
        },
      };
    }
    return null;
  };

  const isDark = currentTheme === 'dark';
  const theme = {
    background: 'transparent',
    textColor: isDark ? '#888888' : '#6b6b6b',
    fontSize: 11,
    axis: {
      domain: {
        line: {
          stroke: isDark ? '#1e1e1e' : '#e2ddd5',
          strokeWidth: 1,
        },
      },
      legend: {
        text: {
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          fill: isDark ? '#e8e8e8' : '#111111',
        },
      },
      ticks: {
        line: {
          stroke: isDark ? '#1e1e1e' : '#e2ddd5',
          strokeWidth: 1,
        },
        text: {
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          fill: isDark ? '#888888' : '#6b6b6b',
        },
      },
    },
    grid: {
      line: {
        stroke: isDark ? '#1e1e1e' : '#e2ddd5',
        strokeWidth: 1,
        strokeDasharray: '4 4',
      },
    },
    legends: {
      title: {
        text: {
          fontSize: 11,
          fontFamily: "'DM Sans', sans-serif",
          fill: isDark ? '#e8e8e8' : '#111111',
        },
      },
      text: {
        fontSize: 11,
        fontFamily: "'DM Sans', sans-serif",
        fill: isDark ? '#e8e8e8' : '#111111',
      },
    },
    tooltip: {
      container: {
        background: isDark ? '#141414' : '#ffffff',
        color: isDark ? '#e8e8e8' : '#111111',
        fontSize: 12,
        fontFamily: "'DM Mono', monospace",
        borderRadius: '8px',
        boxShadow: 'none',
        border: `1px solid ${isDark ? '#1e1e1e' : '#e2ddd5'}`,
        padding: '12px',
      },
    },
  };

  return (
    <div style={{ height: chartHeight, width: '100%' }}>
      <ResponsiveLine
        data={data}
        theme={theme}
        margin={{
          top: 20,
          right: needsDualAxes ? 80 : 80,
          bottom: 50,
          left: 80,
        }}
        xScale={{
          type: 'time',
          format: '%Y-%m-%d',
          precision: 'day',
        }}
        xFormat="time:%Y-%m-%d"
        yScale={{
          type: 'linear',
          min: 0,
          max: 'auto',
          stacked: false,
          reverse: false,
        }}
        yFormat={(value) => {
          if (chartViewMode === 'revenue') {
            return `$${value.toFixed(2)}`;
          }
          return value.toLocaleString();
        }}
        axisTop={null}
        axisRight={getAxisRight()}
        axisBottom={{
          orient: 'bottom',
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Date',
          legendOffset: 40,
          legendPosition: 'middle',
          format: dateFormat,
          tickValues: tickValues,
        }}
        axisLeft={getAxisLeft()}
        curve="monotoneX"
        enablePoints={false}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        lineWidth={2.5}
        useMesh={true}
        enableGridX={true}
        enableGridY={true}
        enableSlices="x"
        legends={[]}
        colors={{ datum: 'color' }}
        enableArea={false}
        areaOpacity={0.1}
        isInteractive={true}
        debugMesh={false}
        tooltip={({ point }) => (
          <div
            style={{
              background: currentTheme === 'dark' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
              color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
              boxShadow: currentTheme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {new Date(point.data.x).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '3px',
                  backgroundColor: point.serieColor,
                  borderRadius: '2px',
                }}
              />
              <span>{point.serieId}:</span>
              <strong>
                {chartViewMode === 'revenue' ? `$${point.data.yFormatted}` : point.data.yFormatted.toLocaleString()}
              </strong>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default NivoLineChart;
