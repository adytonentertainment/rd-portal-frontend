/**
 * Income Period Parser
 * Parses income period strings like "202404202404" (YYYYMMYYYYMM format)
 * into usable date ranges and quarters
 */

class IncomePeriodParser {
  /**
   * Parse income period string
   * @param {string} periodString - Format: "202404202404" (start YYYYMM + end YYYYMM)
   * @returns {Object} Parsed period data
   */
  static parse(periodString) {
    if (!periodString || typeof periodString !== 'string') {
      return null;
    }

    // Remove any whitespace
    const cleaned = periodString.trim();

    // Expected format: YYYYMMYYYYMM (12 digits)
    if (cleaned.length !== 12 || !/^\d{12}$/.test(cleaned)) {
      return null;
    }

    // Extract start and end dates
    const startYear = parseInt(cleaned.substring(0, 4));
    const startMonth = parseInt(cleaned.substring(4, 6));
    const endYear = parseInt(cleaned.substring(6, 10));
    const endMonth = parseInt(cleaned.substring(10, 12));

    // Validate dates
    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
      return null;
    }

    // Create Date objects
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth - 1, 1);

    // Calculate quarter
    const quarter = Math.ceil(startMonth / 3);
    const quarterLabel = `${startYear}-Q${quarter}`;

    // Determine if same month or multi-month period
    const isSameMonth = startYear === endYear && startMonth === endMonth;
    const isSameQuarter = startYear === endYear && Math.ceil(startMonth / 3) === Math.ceil(endMonth / 3);

    return {
      startYear,
      startMonth,
      endYear,
      endMonth,
      startDate,
      endDate,
      quarter,
      quarterLabel,
      isSameMonth,
      isSameQuarter,
      raw: periodString,
    };
  }

  /**
   * Format period for display
   * @param {Object} parsedPeriod - Result from parse()
   * @param {string} format - Display format: 'month', 'quarter', 'range'
   * @returns {string} Formatted string
   */
  static format(parsedPeriod, format = 'quarter') {
    if (!parsedPeriod) return 'Unknown';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthNamesFull = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const { startYear, startMonth, endYear, endMonth, isSameMonth, quarterLabel } = parsedPeriod;

    switch (format) {
      case 'month':
        // "April 2024"
        return `${monthNamesFull[startMonth - 1]} ${startYear}`;

      case 'quarter':
        // "2024-Q2"
        return quarterLabel;

      case 'range':
        // "Apr - Jun 2024" or "April 2024" if same month
        if (isSameMonth) {
          return `${monthNamesFull[startMonth - 1]} ${startYear}`;
        }

        if (startYear === endYear) {
          return `${monthNames[startMonth - 1]} - ${monthNames[endMonth - 1]} ${startYear}`;
        }

        return `${monthNames[startMonth - 1]} ${startYear} - ${monthNames[endMonth - 1]} ${endYear}`;

      case 'short':
        // "Apr 2024"
        return `${monthNames[startMonth - 1]} ${startYear}`;

      default:
        return quarterLabel;
    }
  }

  /**
   * Get quarter from period - handles multiple formats
   * @param {string} periodString - Various formats supported
   * @returns {string} Quarter label like "2024-Q2"
   */
  static getQuarter(periodString) {
    if (!periodString || typeof periodString !== 'string') {
      return null;
    }

    const cleaned = periodString.trim();

    // Try standard 12-digit format first (YYYYMMYYYYMM)
    const parsed = this.parse(cleaned);
    if (parsed) {
      return parsed.quarterLabel;
    }

    // Try "2024-Q1" or "2024-Q2" format
    const dashQFormat = cleaned.match(/^(\d{4})-Q([1-4])$/i);
    if (dashQFormat) {
      return `${dashQFormat[1]}-Q${dashQFormat[2]}`;
    }

    // Try "Q1 2024" or "Q2 2024" format
    const qSpaceFormat = cleaned.match(/^Q([1-4])\s+(\d{4})$/i);
    if (qSpaceFormat) {
      return `${qSpaceFormat[2]}-Q${qSpaceFormat[1]}`;
    }

    // Try "2024Q1" format (no separator)
    const yearQFormat = cleaned.match(/^(\d{4})Q([1-4])$/i);
    if (yearQFormat) {
      return `${yearQFormat[1]}-Q${yearQFormat[2]}`;
    }

    // Try "Q12024" format
    const qYearFormat = cleaned.match(/^Q([1-4])(\d{4})$/i);
    if (qYearFormat) {
      return `${qYearFormat[2]}-Q${qYearFormat[1]}`;
    }

    // Try month-year formats like "Apr 2024", "April 2024", "2024-04"
    const monthNames = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    // "Apr 2024" or "April 2024"
    const monthYearFormat = cleaned.match(/^([a-z]+)\s+(\d{4})$/i);
    if (monthYearFormat) {
      const month = monthNames[monthYearFormat[1].toLowerCase()];
      if (month) {
        const quarter = Math.ceil(month / 3);
        return `${monthYearFormat[2]}-Q${quarter}`;
      }
    }

    // "2024-04" or "2024/04"
    const yearMonthFormat = cleaned.match(/^(\d{4})[-/](\d{1,2})$/);
    if (yearMonthFormat) {
      const month = parseInt(yearMonthFormat[2]);
      if (month >= 1 && month <= 12) {
        const quarter = Math.ceil(month / 3);
        return `${yearMonthFormat[1]}-Q${quarter}`;
      }
    }

    // "04/2024" or "04-2024"
    const monthYearNumFormat = cleaned.match(/^(\d{1,2})[-/](\d{4})$/);
    if (monthYearNumFormat) {
      const month = parseInt(monthYearNumFormat[1]);
      if (month >= 1 && month <= 12) {
        const quarter = Math.ceil(month / 3);
        return `${monthYearNumFormat[2]}-Q${quarter}`;
      }
    }

    return null;
  }

  /**
   * Group transactions by income period quarters
   * @param {Array} transactions - Array of transaction objects with incomePeriod field
   * @returns {Object} Grouped by quarter with totals
   */
  static groupByQuarter(transactions) {
    const grouped = {};

    transactions.forEach((transaction) => {
      const periodString = transaction.incomePeriod || transaction.period;
      if (!periodString) return;

      const quarterLabel = this.getQuarter(periodString);
      if (!quarterLabel) return;

      if (!grouped[quarterLabel]) {
        grouped[quarterLabel] = {
          quarter: quarterLabel,
          total: 0,
          count: 0,
          transactions: [],
        };
      }

      grouped[quarterLabel].total += transaction.amount || 0;
      grouped[quarterLabel].count++;
      grouped[quarterLabel].transactions.push(transaction);
    });

    return grouped;
  }
}

export default IncomePeriodParser;
