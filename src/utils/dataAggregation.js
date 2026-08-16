/**
 * Data Aggregation Utilities for Time-Series Visualization
 * Implements adaptive granularity based on timeframe selection
 */

/**
 * Format a date as YYYY-MM-DD string (timezone-safe)
 * @param {number} year - The year
 * @param {number} month - The month (0-indexed)
 * @param {number} day - The day
 * @returns {string} - Date string in YYYY-MM-DD format
 */
const formatDateString = (year, month, day) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

/**
 * Get the start of the week (Monday) for a given date
 * @param {Date} date - The date to process
 * @returns {string} - Monday of the week as YYYY-MM-DD string
 */
export const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
  return formatDateString(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
};

/**
 * Get the start of the month for a given date
 * @param {Date} date - The date to process
 * @returns {string} - First day of the month as YYYY-MM-DD string
 */
export const getMonthStart = (date) => {
  const d = new Date(date);
  return formatDateString(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Get the start of the quarter for a given date
 * @param {Date} date - The date to process
 * @returns {string} - First day of the quarter as YYYY-MM-DD string
 */
export const getQuarterStart = (date) => {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  return formatDateString(d.getFullYear(), quarter * 3, 1);
};

/**
 * Calculate the number of days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} - Number of days
 */
const getDaysDifference = (startDate, endDate) => {
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determine the appropriate granularity based on timeframe and date range
 * @param {Date} startDate - Start date of the range
 * @param {Date} endDate - End date of the range
 * @param {string} timeframe - The selected timeframe label
 * @param {number} [dataPointCount] - Optional number of data points available (used for density-based decisions)
 * @returns {string} - 'daily', 'weekly', 'monthly', or 'quarterly'
 */
export const determineGranularity = (startDate, endDate, timeframe, dataPointCount = null) => {
  const days = getDaysDifference(startDate, endDate);

  switch (timeframe) {
    case 'Last 7 Days':
      return 'daily'; // 7 daily points

    case 'Last 30 Days':
      return 'daily'; // 30 daily points

    case 'Last 365 Days':
      // Data density-based logic: sparse data benefits from weekly aggregation,
      // while dense data (daily entries) benefits from monthly to prevent overcrowding
      if (dataPointCount !== null && dataPointCount < 100) {
        return 'weekly'; // Sparse data - use weekly for better visualization
      }
      return 'monthly'; // Dense data (~12 monthly points)

    case 'Year To Date':
      // Dynamic based on days elapsed in the current year
      // Rationale: Early in the year, daily data is manageable. As months accumulate,
      // aggregation prevents chart overcrowding while maintaining meaningful trends
      if (days <= 30) {
        return 'daily'; // Jan: ~30 daily points
      } else if (days <= 90) {
        return 'weekly'; // Jan-Mar: ~12 weekly points
      } else {
        return 'monthly'; // Apr onwards: ~4-12 monthly points
      }

    case 'All Time':
      // Adaptive based on total range
      if (days < 90) {
        return 'weekly';
      } else if (days <= 730) {
        // 2 years
        return 'monthly';
      } else {
        return 'quarterly';
      }

    default:
      return 'daily';
  }
};

/**
 * Check if a period is complete based on granularity
 * Used to filter out incomplete trailing periods that could skew visualizations
 * Completeness is assessed solely against the provided endDate, not today's date,
 * to correctly handle historical date ranges.
 * @param {string} periodKey - The period key (YYYY-MM-DD format, representing period start)
 * @param {string} granularity - 'weekly', 'monthly', or 'quarterly'
 * @param {Date} endDate - The end date of the overall data range
 * @returns {boolean} - True if the period is complete, false if incomplete
 */
const isCompletePeriod = (periodKey, granularity, endDate) => {
  const periodStart = new Date(periodKey);

  // Calculate the end of the period
  let periodEnd;

  switch (granularity) {
    case 'weekly': {
      // Week ends 6 days after start (Monday to Sunday)
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
      break;
    }
    case 'monthly': {
      // Month ends on the last day of that month
      periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
      break;
    }
    case 'quarterly': {
      // Quarter ends on the last day of the third month
      const quarterMonth = periodStart.getMonth();
      periodEnd = new Date(periodStart.getFullYear(), quarterMonth + 3, 0);
      break;
    }
    default:
      return true; // Daily data is always "complete"
  }

  // A period is complete only when its periodEnd is on or before dataEndDate.
  // This correctly handles historical ranges where endDate is in the past.
  const dataEndDate = new Date(endDate);
  dataEndDate.setHours(0, 0, 0, 0);
  periodEnd.setHours(0, 0, 0, 0);

  return periodEnd <= dataEndDate;
};

/**
 * Aggregate daily data points by the specified granularity
 * @param {Array} dailyData - Array of daily data points with date, revenue, streams, etc.
 * @param {string} granularity - 'daily', 'weekly', 'monthly', or 'quarterly'
 * @param {Date} [endDate] - Optional end date for incomplete period detection
 * @returns {Object} - { data: aggregatedData, filteredCount: number }
 */
export const aggregateDataByGranularity = (dailyData, granularity, endDate = null) => {
  if (!dailyData || dailyData.length === 0) {
    return { data: [], filteredCount: 0 };
  }

  if (granularity === 'daily') {
    return { data: dailyData, filteredCount: 0 }; // No aggregation needed
  }

  const aggregated = {};

  dailyData.forEach((dataPoint) => {
    // Validate date - support both 'date' and 'date_added' fields
    const dateValue = dataPoint.date || dataPoint.date_added;
    if (!dateValue) {
      return; // Skip invalid data points
    }

    const date = new Date(dateValue);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('[dataAggregation] Invalid date:', dateValue);
      return; // Skip invalid dates
    }

    let periodKey;

    switch (granularity) {
      case 'weekly':
        periodKey = getWeekStart(date);
        break;

      case 'monthly':
        periodKey = getMonthStart(date);
        break;

      case 'quarterly':
        periodKey = getQuarterStart(date);
        break;

      default:
        periodKey = dataPoint.date;
    }

    if (!aggregated[periodKey]) {
      aggregated[periodKey] = {
        date: periodKey,
        dataPoints: [],
        count: 0,
      };
    }

    // Store all data points for this period
    aggregated[periodKey].dataPoints.push(dataPoint);
    aggregated[periodKey].count += 1;
  });

  // Convert to array, take the maximum cumulative value from each period, and sort by date
  // We use max because playcount data is cumulative - the highest value represents the end of period total
  const sortedData = Object.values(aggregated)
    .map((period) => {
      // Find the maximum values for each metric (since data is cumulative)
      const maxValues = period.dataPoints.reduce(
        (acc, point) => ({
          revenue: Math.max(acc.revenue, point.revenue || 0),
          streams: Math.max(acc.streams, point.streams || 0),
          spotify_playcount: Math.max(acc.spotify_playcount, point.spotify_playcount || 0),
          youtube_playcount: Math.max(acc.youtube_playcount, point.youtube_playcount || 0),
          master_royalty: Math.max(acc.master_royalty, point.master_royalty || 0),
          publishing_royalty: Math.max(acc.publishing_royalty, point.publishing_royalty || 0),
        }),
        {
          revenue: 0,
          streams: 0,
          spotify_playcount: 0,
          youtube_playcount: 0,
          master_royalty: 0,
          publishing_royalty: 0,
        }
      );

      return {
        date: period.date,
        ...maxValues,
        count: period.count,
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Filter out incomplete trailing periods if endDate is provided
  // We only exclude the last period if it's incomplete to avoid removing historical data
  let filteredCount = 0;

  if (endDate && sortedData.length > 0) {
    const lastPeriod = sortedData[sortedData.length - 1];

    // Only filter if we have more than 2 data points (growth view requires minimum 2 points)
    if (sortedData.length > 2 && !isCompletePeriod(lastPeriod.date, granularity, endDate)) {
      console.warn(`[dataAggregation] Filtering incomplete ${granularity} period: ${lastPeriod.date}`);
      sortedData.pop();
      filteredCount = 1;
    }
  }

  return { data: sortedData, filteredCount };
};

/**
 * Main function to apply adaptive granularity to raw data
 * Passes data point count to enable density-based granularity decisions
 * and filters incomplete trailing periods from aggregated results
 * @param {Array} dailyData - Array of daily data points
 * @param {Date} startDate - Start date of the range
 * @param {Date} endDate - End date of the range
 * @param {string} timeframe - The selected timeframe label
 * @returns {Object} - { data: aggregatedData, granularity: usedGranularity, filteredCount: number }
 */
export const applyAdaptiveGranularity = (dailyData, startDate, endDate, timeframe) => {
  // Pass data point count to enable density-based granularity for "Last 365 Days"
  const dataPointCount = dailyData ? dailyData.length : 0;
  const granularity = determineGranularity(startDate, endDate, timeframe, dataPointCount);

  // Pass endDate to enable incomplete period detection
  const { data: aggregatedData, filteredCount } = aggregateDataByGranularity(dailyData, granularity, endDate);

  return {
    data: aggregatedData,
    granularity: granularity,
    filteredCount: filteredCount,
  };
};

/**
 * Transform data from TuneScan format to Nivo line chart format
 * @param {Array} data - Array of data points with date and metrics
 * @param {Array} metrics - Array of metric keys to extract (e.g., ['spotify_playcount', 'youtube_playcount'])
 * @param {Object} labels - Optional custom labels for metrics (e.g., { spotify_playcount: 'Spotify' })
 * @returns {Array} - Array of series in Nivo format:
 *   [
 *     { id: 'Spotify', data: [{ x: '2024-01-01', y: 1000 }, ...] },
 *     { id: 'YouTube', data: [{ x: '2024-01-01', y: 500 }, ...] }
 *   ]
 */
export const transformToNivoFormat = (data, metrics, labels = {}) => {
  if (!data || data.length === 0) {
    return [];
  }

  // Create a series for each metric
  return metrics.map((metric) => {
    const seriesLabel = labels[metric] || metric;

    return {
      id: seriesLabel,
      data: data.map((point) => ({
        x: point.date,
        y: point[metric] || 0,
      })),
    };
  });
};

/**
 * Transform Chart.js formatted data to Nivo format
 * @param {Object} chartJsData - Chart.js format: { labels: [...], datasets: [...] }
 * @returns {Array} - Array of series in Nivo format
 */
export const transformChartJsToNivo = (chartJsData) => {
  if (!chartJsData || !chartJsData.labels || !chartJsData.datasets) {
    return [];
  }

  return chartJsData.datasets.map((dataset) => ({
    id: dataset.label,
    data: chartJsData.labels.map((label, idx) => ({
      x: label,
      y: dataset.data[idx] || 0,
    })),
  }));
};

/**
 * Transform data for multi-axis Nivo charts
 * @param {Array} data - Array of data points with date and metrics
 * @param {Object} axisConfig - Configuration for axes:
 *   {
 *     leftAxis: { metrics: ['spotify_playcount'], label: 'Streams' },
 *     rightAxis: { metrics: ['master_royalty'], label: 'Revenue' }
 *   }
 * @returns {Object} - { leftSeries: [...], rightSeries: [...], axisConfig: {...} }
 */
export const transformToNivoMultiAxis = (data, axisConfig) => {
  const leftSeries = transformToNivoFormat(data, axisConfig.leftAxis.metrics, axisConfig.leftAxis.labels || {});

  const rightSeries = transformToNivoFormat(data, axisConfig.rightAxis.metrics, axisConfig.rightAxis.labels || {});

  return {
    leftSeries,
    rightSeries,
    axisConfig,
  };
};

/**
 * ============================================================================
 * UNIT TEST SCENARIOS
 * ============================================================================
 *
 * determineGranularity Tests:
 * ---------------------------
 * 1. "Last 365 Days" with 50 data points → should return 'weekly' (sparse data)
 * 2. "Last 365 Days" with 365 data points → should return 'monthly' (dense data)
 * 3. "Last 365 Days" with null dataPointCount → should return 'monthly' (default behavior)
 * 4. "Year To Date" on Jan 15 (15 days) → should return 'daily'
 * 5. "Year To Date" on May 1 (~120 days) → should return 'monthly'
 * 6. "Year To Date" on Mar 15 (~75 days) → should return 'weekly'
 *
 * isCompletePeriod Tests:
 * -----------------------
 * 1. Weekly period ending before today → should return true
 * 2. Weekly period ending after today (current week) → should return false
 * 3. Monthly period for completed month → should return true
 * 4. Monthly period for current month → should return false
 * 5. Quarterly period for completed quarter → should return true
 * 6. Quarterly period for current quarter → should return false
 *
 * aggregateDataByGranularity Tests:
 * ---------------------------------
 * 1. Incomplete month at end of range → last period should be filtered
 * 2. Complete historical months → all periods should be preserved
 * 3. Edge case with only 1 data point → should not filter (returns all)
 * 4. Edge case with only 2 data points → should not filter (minimum for growth)
 * 5. Empty data array → should return { data: [], filteredCount: 0 }
 * 6. Daily granularity → should return unchanged data with filteredCount: 0
 *
 * applyAdaptiveGranularity Integration Tests:
 * -------------------------------------------
 * 1. Sparse data + "Last 365 Days" → weekly granularity applied
 * 2. Dense data + "Last 365 Days" → monthly granularity applied
 * 3. Returns filteredCount when incomplete periods removed
 * 4. Returns filteredCount: 0 when no filtering occurs
 */
