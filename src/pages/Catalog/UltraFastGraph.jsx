import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';

const UltraFastGraph = ({
  data,
  selectedServices = ['Spotify', 'YouTube'],
  selectedRevenueTypes = ['Master', 'Publishing'],
  chartViewMode = 'streams',
  isAllTime = false,
  selectedTimeframe = 'All Time',
  width,
  height,
  className = '',
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [dimensions, setDimensions] = useState({
    width: width || 800,
    height: height || 500,
  });
  const [themeVersion, setThemeVersion] = useState(0);
  const frameRef = useRef(null);
  const pointsRef = useRef([]);

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeVersion((v) => v + 1);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Auto-size to container if width/height not provided
  useEffect(() => {
    if (width && height) return; // Use provided dimensions

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 800,
          height: rect.height || 500,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, height]);

  const actualWidth = width || dimensions.width;
  const actualHeight = height || dimensions.height;

  // Pre-process and cache data with aggressive decimation
  const processedData = useMemo(() => {
    if (!data) {
      return { lines: [], labels: [], max: 0, min: 0, niceMax: 0, niceMin: 0 };
    }

    // Handle Chart.js formatted data (labels + datasets)
    if (!data.labels || !data.datasets || data.labels.length === 0 || data.datasets.length === 0) {
      return { lines: [], labels: [], max: 0, min: 0, niceMax: 0, niceMin: 0 };
    }

    // Smart decimation: adjust based on data density and timeframe
    const dataLength = data.labels.length;

    // For small datasets, show all points
    // For larger datasets, decimate intelligently based on timeframe
    let maxPoints;
    if (dataLength <= 100) {
      // Small datasets: show all points
      maxPoints = dataLength;
    } else if (isAllTime) {
      // All Time: show more points to capture long-term trends (up to 200 points)
      maxPoints = Math.min(dataLength, 200);
    } else {
      // Short timeframes: show fewer points (50)
      maxPoints = 50;
    }
    const step = Math.ceil(dataLength / maxPoints);

    const labels = [];
    const lines = [];
    let max = -Infinity;
    let min = Infinity;

    // Always include first and last point for accuracy
    const indices = [];
    indices.push(0); // First point

    for (let i = step; i < dataLength - 1; i += step) {
      indices.push(i);
    }

    if (dataLength > 1 && indices[indices.length - 1] !== dataLength - 1) {
      indices.push(dataLength - 1); // Last point
    }

    // Collect labels for selected indices
    indices.forEach((i) => {
      labels.push(data.labels[i]);
    });

    // Separate streams and revenue for dual y-axes
    let streamMax = -Infinity;
    let streamMin = Infinity;
    let revenueMax = -Infinity;
    let revenueMin = Infinity;

    // Track each line's own min/max for independent scaling
    const lineStats = [];

    // Process each dataset (Spotify, YouTube, etc.)
    // Note: Datasets are already filtered in Catalog.jsx before being passed here
    data.datasets.forEach((dataset) => {
      const isRevenue = dataset.yAxisID === 'y1';
      const isStream = !isRevenue;

      const decimatedData = [];
      let lineMin = Infinity;
      let lineMax = -Infinity;

      indices.forEach((i) => {
        const value = dataset.data[i] || 0;
        decimatedData.push(value);

        lineMin = Math.min(lineMin, value);
        lineMax = Math.max(lineMax, value);

        if (isRevenue) {
          revenueMax = Math.max(revenueMax, value);
          revenueMin = Math.min(revenueMin, value);
        } else {
          streamMax = Math.max(streamMax, value);
          streamMin = Math.min(streamMin, value);
        }

        max = Math.max(max, value);
        min = Math.min(min, value);
      });

      lineStats.push({ min: lineMin, max: lineMax, isRevenue });

      // Use consistent colors for revenue lines that match the percentage indicators
      let lineColor = dataset.borderColor || dataset.backgroundColor || '#1DB954';

      // Override colors for Master and Publishing revenue to match the catalog display
      if (dataset.label && dataset.label.includes('Master')) {
        lineColor = '#fb923c'; // Orange - matches text-orange-400
      } else if (dataset.label && dataset.label.includes('Publishing')) {
        lineColor = '#2dd4bf'; // Teal/Cyan - matches text-teal-400
      }

      lines.push({
        label: dataset.label,
        data: decimatedData,
        color: lineColor,
        yAxisID: dataset.yAxisID || 'y',
      });
    });

    // Store separate min/max for each axis
    const hasRevenue = lines.some((l) => l.yAxisID === 'y1');
    const hasStreams = lines.some((l) => l.yAxisID === 'y');

    if (!hasStreams) {
      streamMax = 0;
      streamMin = 0;
    }
    if (!hasRevenue) {
      revenueMax = 0;
      revenueMin = 0;
    }

    // Helper function to calculate nice axis bounds with zoomed perspective
    const calculateNiceBounds = (minVal, maxVal, isAllTime = false, individualLineStats = []) => {
      const range = maxVal - minVal;
      if (range === 0) {
        return {
          niceMin: minVal * 0.9,
          niceMax: maxVal * 1.1,
        };
      }

      let zoomedMin, zoomedMax;

      if (isAllTime) {
        // For "All Time" view, always start from 0 to show full growth
        zoomedMin = 0;
        zoomedMax = maxVal * 1.05; // 5% padding on top
      } else {
        // For shorter time periods, use much tighter y-axis bounds
        // Focus ONLY on the actual variation range, not the absolute values
        const actualGrowth = maxVal - minVal;

        // Calculate what percentage the growth represents
        const growthPercent = actualGrowth / maxVal;

        // If the growth is very small relative to the total (< 5%), use ULTRA-tight bounds
        if (growthPercent < 0.05) {
          // AGGRESSIVE zoom: 0.1% padding on each side
          zoomedMin = minVal * 0.999; // 99.9% of min
          zoomedMax = maxVal * 1.001; // 100.1% of max
        } else if (growthPercent < 0.1) {
          // Very tight bounds for small growth
          zoomedMin = minVal * 0.995; // 99.5% of min
          zoomedMax = maxVal * 1.005; // 100.5% of max
        } else {
          // Normal zoom with minimal padding
          const paddingPercent = 0.02; // 2% padding
          zoomedMin = minVal - actualGrowth * paddingPercent;
          zoomedMax = maxVal + actualGrowth * paddingPercent;

          // Don't let min go below 95% of the minimum value
          zoomedMin = Math.max(minVal * 0.95, zoomedMin);
        }

        // Ensure we have at least a tiny range to avoid division by zero
        if (zoomedMax - zoomedMin < 1) {
          const midpoint = (zoomedMax + zoomedMin) / 2;
          zoomedMin = midpoint - 0.5;
          zoomedMax = midpoint + 0.5;
        }
      }

      const zoomedRange = zoomedMax - zoomedMin;
      const roughStep = zoomedRange / 4;
      const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
      const residual = roughStep / magnitude;

      let niceStep;
      if (residual > 5) niceStep = 10 * magnitude;
      else if (residual > 2) niceStep = 5 * magnitude;
      else if (residual > 1) niceStep = 2 * magnitude;
      else niceStep = magnitude;

      // For short timeframes, don't round to nice numbers - use exact bounds for maximum zoom
      if (!isAllTime) {
        return {
          niceMin: zoomedMin,
          niceMax: zoomedMax,
        };
      }

      return {
        niceMin: Math.max(0, Math.floor(zoomedMin / niceStep) * niceStep), // Never go below 0
        niceMax: Math.ceil(zoomedMax / niceStep) * niceStep,
      };
    };

    const streamLineStats = lineStats.filter((s) => !s.isRevenue);
    const revenueLineStats = lineStats.filter((s) => s.isRevenue);

    const streamBounds = calculateNiceBounds(streamMin, streamMax, isAllTime, streamLineStats);
    const revenueBounds = calculateNiceBounds(revenueMin, revenueMax, isAllTime, revenueLineStats);

    const result = {
      lines,
      labels,
      max,
      min,
      niceMax: streamBounds.niceMax,
      niceMin: streamBounds.niceMin,
      streamBounds,
      revenueBounds,
      hasRevenue,
      hasStreams,
    };
    return result;
  }, [data, chartViewMode, selectedServices, selectedRevenueTypes, isAllTime]);

  // Ultra-optimized drawing with requestAnimationFrame
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });

    const dpr = window.devicePixelRatio || 1;

    // Set canvas size once
    if (canvas.width !== actualWidth * dpr) {
      canvas.width = actualWidth * dpr;
      canvas.height = actualHeight * dpr;
      canvas.style.width = `${actualWidth}px`;
      canvas.style.height = `${actualHeight}px`;
      ctx.scale(dpr, dpr);
    }

    // Clear canvas
    ctx.clearRect(0, 0, actualWidth, actualHeight);

    // Draw background - use CSS variable
    const bgColor =
      getComputedStyle(document.documentElement).getPropertyValue('--graph-bg').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--panel-bg').trim() ||
      '#1a1a1a';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, actualWidth, actualHeight);

    const paddingLeft = 80;
    const paddingRight = processedData.hasRevenue ? 80 : 40; // More space if revenue axis needed
    const paddingTop = 40;
    const paddingBottom = 60;
    const graphWidth = actualWidth - paddingLeft - paddingRight;
    const graphHeight = actualHeight - paddingTop - paddingBottom;

    // Use linear scale for all timeframes
    const useLogScale = false;

    // Left Y-axis (streams)
    const streamMin = processedData.streamBounds?.niceMin || 0;
    const streamMax = processedData.streamBounds?.niceMax || processedData.max;
    const streamRange = streamMax - streamMin || 1;

    // Right Y-axis (revenue)
    const revenueMin = processedData.revenueBounds?.niceMin || 0;
    const revenueMax = processedData.revenueBounds?.niceMax || 0;
    const revenueRange = revenueMax - revenueMin || 1;

    // Helper function to convert value to log scale position
    const valueToLogPosition = (value, min, max) => {
      if (value <= 0 || min <= 0) return 0;
      const logMin = Math.log10(Math.max(1, min));
      const logMax = Math.log10(Math.max(1, max));
      const logValue = Math.log10(Math.max(1, value));
      return (logValue - logMin) / (logMax - logMin);
    };

    // Calculate nice tick intervals for Y-axes
    const numYTicks = 6;
    const streamTickInterval = streamRange / (numYTicks - 1);
    const revenueTickInterval = revenueRange / (numYTicks - 1);

    // Enhanced visual styling with CSS variables
    const gridColor =
      getComputedStyle(document.documentElement).getPropertyValue('--graph-grid').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--panel-border').trim() ||
      'rgba(255, 255, 255, 0.05)'; // Subtle grid
    const textColor =
      getComputedStyle(document.documentElement).getPropertyValue('--graph-text').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--muted-text').trim() ||
      'rgba(255, 255, 255, 0.5)'; // Softer text

    // Grid line styling
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5; // Thinner grid lines
    ctx.setLineDash([2, 4]); // Dashed lines for subtlety
    ctx.font = '11px "DM Mono", monospace';

    // Check if we're using per-line scaling
    const streamLines = processedData.lines.filter((l) => l.yAxisID === 'y');
    const revenueLines = processedData.lines.filter((l) => l.yAxisID === 'y1');
    const usePerLineScaling = !isAllTime && (streamLines.length >= 1 || revenueLines.length >= 1);

    // Draw left Y-axis (streams) if we have stream data
    if (processedData.hasStreams) {
      ctx.fillStyle = '#1DB954'; // Spotify green for streams
      ctx.textAlign = 'right';

      // Calculate display bounds for axis labels
      let displayMin = streamMin;
      let displayMax = streamMax;

      if (usePerLineScaling && streamLines.length === 1) {
        // Single stream line - show its actual tight bounds
        const line = streamLines[0];
        const lineMin = Math.min(...line.data);
        const lineMax = Math.max(...line.data);
        const lineGrowth = lineMax - lineMin;
        const growthPercent = lineGrowth / lineMax;

        if (growthPercent < 0.05) {
          displayMin = lineMin * 0.999;
          displayMax = lineMax * 1.001;
        } else {
          displayMin = lineMin * 0.995;
          displayMax = lineMax * 1.005;
        }
      }

      const displayRange = displayMax - displayMin;
      const displayTickInterval = displayRange / (numYTicks - 1);

      if (useLogScale && streamMin > 0) {
        // Logarithmic scale for short timeframes
        const logMin = Math.log10(Math.max(1, streamMin));
        const logMax = Math.log10(Math.max(1, streamMax));
        const logRange = logMax - logMin;

        for (let i = 0; i < numYTicks; i++) {
          const logValue = logMin + (logRange * i) / (numYTicks - 1);
          const value = Math.pow(10, logValue);
          const normalizedPos = (logValue - logMin) / logRange;
          const y = paddingTop + graphHeight - normalizedPos * graphHeight;

          // Grid line
          ctx.strokeStyle = gridColor;
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(actualWidth - paddingRight, y);
          ctx.stroke();

          // Enhanced Y-axis label formatting for streams
          let label;
          if (value >= 1000000000) {
            // Billions
            const val = value / 1000000000;
            label = val >= 10 ? Math.round(val) + 'B' : val.toFixed(1) + 'B';
          } else if (value >= 1000000) {
            // Millions
            const val = value / 1000000;
            label = val >= 10 ? Math.round(val) + 'M' : val.toFixed(1) + 'M';
          } else if (value >= 1000) {
            // Thousands
            const val = value / 1000;
            label = val >= 10 ? Math.round(val) + 'K' : val.toFixed(1) + 'K';
          } else {
            label = Math.round(value).toLocaleString();
          }
          ctx.fillText(label, paddingLeft - 10, y + 4);
        }
      } else {
        // Linear scale
        for (let i = 0; i < numYTicks; i++) {
          const value = displayMin + displayTickInterval * i;
          const y = paddingTop + graphHeight - ((value - displayMin) / displayRange) * graphHeight;

          // Grid line
          ctx.strokeStyle = gridColor;
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(actualWidth - paddingRight, y);
          ctx.stroke();

          // Enhanced Y-axis label formatting for streams
          let label;
          if (value >= 1000000000) {
            // Billions
            const val = value / 1000000000;
            label = val >= 10 ? Math.round(val) + 'B' : val.toFixed(1) + 'B';
          } else if (value >= 1000000) {
            // Millions
            const val = value / 1000000;
            label = val >= 10 ? Math.round(val) + 'M' : val.toFixed(1) + 'M';
          } else if (value >= 1000) {
            // Thousands
            const val = value / 1000;
            label = val >= 10 ? Math.round(val) + 'K' : val.toFixed(1) + 'K';
          } else {
            label = Math.round(value).toLocaleString();
          }
          ctx.fillText(label, paddingLeft - 10, y + 4);
        }
      }
    }

    // Draw right Y-axis (revenue) if we have revenue data
    if (processedData.hasRevenue) {
      ctx.fillStyle = '#f97316'; // Orange for revenue
      ctx.textAlign = 'left';

      // Calculate display bounds for revenue axis labels
      let revenueDisplayMin = revenueMin;
      let revenueDisplayMax = revenueMax;

      if (usePerLineScaling && revenueLines.length === 1) {
        // Single revenue line - show its actual tight bounds
        const line = revenueLines[0];
        const lineMin = Math.min(...line.data);
        const lineMax = Math.max(...line.data);
        const lineGrowth = lineMax - lineMin;
        const growthPercent = lineGrowth / lineMax;

        if (growthPercent < 0.05) {
          revenueDisplayMin = lineMin * 0.999;
          revenueDisplayMax = lineMax * 1.001;
        } else {
          revenueDisplayMin = lineMin * 0.995;
          revenueDisplayMax = lineMax * 1.005;
        }
      }

      const revenueDisplayRange = revenueDisplayMax - revenueDisplayMin;
      const revenueDisplayTickInterval = revenueDisplayRange / (numYTicks - 1);

      if (useLogScale && revenueMin > 0) {
        // Logarithmic scale for short timeframes
        const logMin = Math.log10(Math.max(1, revenueMin));
        const logMax = Math.log10(Math.max(1, revenueMax));
        const logRange = logMax - logMin;

        for (let i = 0; i < numYTicks; i++) {
          const logValue = logMin + (logRange * i) / (numYTicks - 1);
          const value = Math.pow(10, logValue);
          const normalizedPos = (logValue - logMin) / logRange;
          const y = paddingTop + graphHeight - normalizedPos * graphHeight;

          // Enhanced Y-axis label formatting for revenue
          let label;
          if (value >= 1000000) {
            // Millions
            const val = value / 1000000;
            label = '$' + (val >= 10 ? Math.round(val).toString() : val.toFixed(1)) + 'M';
          } else if (value >= 1000) {
            // Thousands
            const val = value / 1000;
            label = '$' + (val >= 10 ? Math.round(val).toString() : val.toFixed(1)) + 'K';
          } else if (value >= 100) {
            label = '$' + Math.round(value).toLocaleString();
          } else {
            label = '$' + value.toFixed(2);
          }
          ctx.fillText(label, actualWidth - paddingRight + 10, y + 4);
        }
      } else {
        // Linear scale
        for (let i = 0; i < numYTicks; i++) {
          const value = revenueDisplayMin + revenueDisplayTickInterval * i;
          const y = paddingTop + graphHeight - ((value - revenueDisplayMin) / revenueDisplayRange) * graphHeight;

          // Enhanced Y-axis label formatting for revenue
          let label;
          if (value >= 1000000) {
            // Millions
            const val = value / 1000000;
            label = '$' + (val >= 10 ? Math.round(val).toString() : val.toFixed(1)) + 'M';
          } else if (value >= 1000) {
            // Thousands
            const val = value / 1000;
            label = '$' + (val >= 10 ? Math.round(val).toString() : val.toFixed(1)) + 'K';
          } else if (value >= 100) {
            label = '$' + Math.round(value).toLocaleString();
          } else {
            label = '$' + value.toFixed(2);
          }
          ctx.fillText(label, actualWidth - paddingRight + 10, y + 4);
        }
      }
    }

    // Draw X-axis labels and vertical grid lines (dynamic based on timeframe)
    ctx.textAlign = 'right';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.setLineDash([2, 4]); // Keep dashed style for vertical grid lines
    if (processedData.labels && processedData.labels.length > 0) {
      // Dynamic X-axis labels based on timeframe
      const maxXLabels = isAllTime ? 15 : 8; // More labels for All Time view
      const numXLabels = Math.min(maxXLabels, processedData.labels.length);
      const xLabelInterval = Math.floor(processedData.labels.length / (numXLabels - 1));

      for (let i = 0; i < numXLabels; i++) {
        const labelIndex = i === numXLabels - 1 ? processedData.labels.length - 1 : i * xLabelInterval;
        // Guard against division by zero when there's only one label
        const normalizedPosition = processedData.labels.length > 1 ? labelIndex / (processedData.labels.length - 1) : 0;
        const x = paddingLeft + normalizedPosition * graphWidth;
        const label = processedData.labels[labelIndex];

        // Only draw if x is valid
        if (!isFinite(x)) continue;

        // Vertical grid line
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, paddingTop + graphHeight);
        ctx.stroke();

        // Enhanced date formatting based on timeframe
        let displayLabel = label;
        if (label && label.includes('/')) {
          const parts = label.split('/');
          if (parts.length === 3) {
            const [month, day, year] = parts;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthName = months[parseInt(month) - 1] || month;

            // Different formatting based on timeframe
            if (processedData.labels.length > 100) {
              // For very long timeframes (All Time), show month/year
              displayLabel = `${monthName} '${year.slice(-2)}`;
            } else if (processedData.labels.length > 30) {
              // For medium timeframes, show month/day
              displayLabel = `${monthName} ${parseInt(day)}`;
            } else {
              // For short timeframes, show full date
              displayLabel = `${monthName} ${parseInt(day)}`;
            }
          }
        } else if (label && label.includes('-')) {
          // Handle YYYY-MM-DD format
          const parts = label.split('-');
          if (parts.length === 3) {
            const [year, month, day] = parts;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthName = months[parseInt(month) - 1] || month;

            if (processedData.labels.length > 100) {
              displayLabel = `${monthName} '${year.slice(-2)}`;
            } else {
              displayLabel = `${monthName} ${parseInt(day)}`;
            }
          }
        }

        // Rotate and draw label (only if x is valid)
        if (isFinite(x)) {
          ctx.fillStyle = textColor;
          ctx.save();
          ctx.translate(x, actualHeight - paddingBottom + 15);
          ctx.rotate(-Math.PI / 4);
          ctx.fillText(displayLabel, 0, 0);
          ctx.restore();
        }
      }
    }

    // Reset line dash for drawing actual chart lines
    ctx.setLineDash([]); // Solid lines for data

    // Draw lines with Path2D for better performance
    // Store point coordinates for hover detection
    const points = [];

    if (processedData.lines && processedData.lines.length > 0) {
      // For short timeframes, use per-line scaling for ALL lines (streams AND revenue)
      const streamLines = processedData.lines.filter((l) => l.yAxisID === 'y');
      const revenueLines = processedData.lines.filter((l) => l.yAxisID === 'y1');
      const usePerLineScaling = !isAllTime && (streamLines.length >= 1 || revenueLines.length >= 1);

      processedData.lines.forEach((line, lineIndex) => {
        if (!line.data || line.data.length < 1) return;

        const path = new Path2D();
        const dataLength = line.data.length;

        // Determine which y-axis to use
        const isRevenue = line.yAxisID === 'y1';
        let yMin, yMax, yRange;

        if (usePerLineScaling) {
          // Calculate tight bounds for THIS LINE ONLY (streams or revenue)
          const lineMin = Math.min(...line.data);
          const lineMax = Math.max(...line.data);
          const lineGrowth = lineMax - lineMin;
          const growthPercent = lineMax !== 0 ? lineGrowth / lineMax : 0;

          // Ultra-tight bounds for small variations
          if (growthPercent < 0.05) {
            yMin = lineMin * 0.999; // 0.1% below min
            yMax = lineMax * 1.001; // 0.1% above max
          } else {
            yMin = lineMin * 0.995; // 0.5% below min
            yMax = lineMax * 1.005; // 0.5% above max
          }
          yRange = yMax - yMin;
        } else {
          // Use shared axis bounds for All Time view
          yMin = isRevenue ? revenueMin : streamMin;
          yMax = isRevenue ? revenueMin + revenueRange : streamMin + streamRange;
          yRange = isRevenue ? revenueRange : streamRange;
        }

        // Guard against invalid yRange
        if (!isFinite(yRange) || yRange === 0) {
          yRange = 1;
        }

        // Draw line (only if multiple points)
        if (dataLength > 1) {
          line.data.forEach((value, i) => {
            const x = paddingLeft + (i / (dataLength - 1)) * graphWidth;
            let y;

            if (useLogScale && yMin > 0 && value > 0) {
              // Use logarithmic positioning
              const logMin = Math.log10(Math.max(1, yMin));
              const logMax = Math.log10(Math.max(1, yMax));
              const logValue = Math.log10(Math.max(1, value));
              const logRange = logMax - logMin;
              const normalizedPos = logRange !== 0 ? (logValue - logMin) / logRange : 0;
              y = paddingTop + graphHeight - normalizedPos * graphHeight;
            } else {
              // Use linear positioning
              const normalizedValue = yRange !== 0 ? (value - yMin) / yRange : 0;
              y = paddingTop + graphHeight - normalizedValue * graphHeight;
            }

            // Ensure coordinates are valid before drawing
            if (isFinite(x) && isFinite(y)) {
              if (i === 0) path.moveTo(x, y);
              else path.lineTo(x, y);
            }
          });

          ctx.strokeStyle = line.color;
          ctx.lineWidth = 2;
          ctx.stroke(path);
        }

        // Draw data points (circles) for visibility
        ctx.fillStyle = line.color;
        const pointRadius = dataLength > 30 ? 2 : dataLength > 15 ? 3 : dataLength === 1 ? 8 : 4; // Larger dot for single data point

        line.data.forEach((value, i) => {
          // For single data point, center it; otherwise distribute across width
          const x = dataLength === 1 ? paddingLeft + graphWidth / 2 : paddingLeft + (i / (dataLength - 1)) * graphWidth;

          let y;
          if (useLogScale && yMin > 0 && value > 0) {
            // Use logarithmic positioning
            const logMin = Math.log10(Math.max(1, yMin));
            const logMax = Math.log10(Math.max(1, yMax));
            const logValue = Math.log10(Math.max(1, value));
            const logRange = logMax - logMin;
            const normalizedPos = logRange !== 0 ? (logValue - logMin) / logRange : 0;
            y = paddingTop + graphHeight - normalizedPos * graphHeight;
          } else {
            // Use linear positioning
            const normalizedValue = yRange !== 0 ? (value - yMin) / yRange : 0;
            y = paddingTop + graphHeight - normalizedValue * graphHeight;
          }

          // Only store and draw points if coordinates are valid
          if (!isFinite(x) || !isFinite(y)) {
            return;
          }

          // Store point data for hover detection
          points.push({
            x,
            y,
            value,
            label: processedData.labels[i],
            lineName: line.label,
            lineColor: line.color,
            isRevenue,
            index: i,
            lineIndex,
          });

          // Check if this point is hovered
          const isHovered = hoveredPoint && hoveredPoint.lineIndex === lineIndex && hoveredPoint.index === i;

          ctx.beginPath();
          ctx.arc(x, y, isHovered ? pointRadius * 2 : pointRadius, 0, Math.PI * 2);
          ctx.fill();

          // Draw highlight ring on hovered point
          if (isHovered) {
            ctx.strokeStyle = line.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, pointRadius * 2.5, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      });
    }

    // Store points for hover detection
    pointsRef.current = points;
  }, [processedData, selectedServices, actualWidth, actualHeight, themeVersion, hoveredPoint]);

  // Draw once when data changes
  useEffect(() => {
    if (!processedData.lines || processedData.lines.length === 0) return;

    // Cancel any pending frame
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    // Draw on next frame
    frameRef.current = requestAnimationFrame(drawGraph);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [drawGraph, processedData]);

  // Handle mouse move for hover detection
  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: mouseX, y: mouseY });

    // Find closest point within hover radius
    const hoverRadius = 10;
    let closestPoint = null;
    let closestDistance = hoverRadius;

    pointsRef.current.forEach((point) => {
      const distance = Math.sqrt(Math.pow(point.x - mouseX, 2) + Math.pow(point.y - mouseY, 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    });

    setHoveredPoint(closestPoint);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setMousePos(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
        flex: height ? undefined : 1,
        minHeight: height ? undefined : 0,
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--panel-border)',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'crisp-edges',
          transform: 'translateZ(0)',
          willChange: 'transform',
          cursor: hoveredPoint ? 'pointer' : 'default',
        }}
      />

      {/* Tooltip */}
      {hoveredPoint && mousePos && (
        <div
          style={{
            position: 'absolute',
            left: mousePos.x + 15,
            top: mousePos.y - 10,
            background: 'var(--surface, #141414)',
            border: '1px solid var(--border, #1e1e1e)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontFamily: "'DM Mono', monospace",
            color: 'var(--text, #e8e8e8)',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              fontWeight: '600',
              color: hoveredPoint.lineColor,
              marginBottom: '4px',
            }}
          >
            {hoveredPoint.lineName}
          </div>
          <div style={{ color: '#ccc' }}>{hoveredPoint.label}</div>
          <div style={{ fontWeight: '700', fontSize: '14px', marginTop: '4px' }}>
            {hoveredPoint.isRevenue ? `$${hoveredPoint.value.toLocaleString()}` : hoveredPoint.value.toLocaleString()}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: 20,
          fontSize: '12px',
          pointerEvents: 'none',
        }}
      >
        {processedData.lines &&
          processedData.lines.map((line, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 2, backgroundColor: line.color }} />
              <span style={{ color: 'var(--soft-text)' }}>{line.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default React.memo(UltraFastGraph, (prev, next) => {
  return (
    JSON.stringify(prev.data) === JSON.stringify(next.data) &&
    JSON.stringify(prev.selectedServices) === JSON.stringify(next.selectedServices) &&
    JSON.stringify(prev.selectedRevenueTypes) === JSON.stringify(next.selectedRevenueTypes) &&
    prev.chartViewMode === next.chartViewMode &&
    prev.isAllTime === next.isAllTime
  );
});
