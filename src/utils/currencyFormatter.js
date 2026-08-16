/**
 * Smart Currency Formatter Utility
 * Intelligently formats currency values with adaptive decimal handling
 */

class SmartCurrencyFormatter {
  /**
   * Format currency with intelligent decimal detection
   * @param {number|string} value - The value to format
   * @param {object} options - Formatting options
   * @returns {string} Formatted currency string
   */
  static format(value, options = {}) {
    const {
      currency = 'USD',
      locale = 'en-US',
      forceDecimals = null, // null = auto, true = always show, false = never show
      abbreviate = false, // true to show as 1.2K, 3.4M, etc.
      minDecimals = null,
      maxDecimals = null,
    } = options;

    // Convert to number and validate
    const numValue = this.parseNumber(value);
    if (isNaN(numValue)) {
      console.warn('Invalid number provided to currency formatter:', value);
      return '$0.00';
    }

    // Handle abbreviation for large numbers
    if (abbreviate) {
      return this.abbreviateNumber(numValue, currency);
    }

    // Determine decimal places intelligently
    const decimals = this.determineDecimals(numValue, {
      forceDecimals,
      minDecimals,
      maxDecimals,
    });

    // Format using Intl.NumberFormat
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals.min,
        maximumFractionDigits: decimals.max,
      }).format(numValue);
    } catch (error) {
      console.error('Currency formatting error:', error);
      // Fallback formatting
      return `$${numValue.toFixed(2)}`;
    }
  }

  /**
   * Parse various number formats intelligently
   */
  static parseNumber(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Convert to string and clean
    let str = String(value).trim();

    // Remove currency symbols and whitespace
    str = str.replace(/[$£€¥₹\s,]/g, '');

    // Handle parentheses for negative values
    if (str.startsWith('(') && str.endsWith(')')) {
      str = '-' + str.slice(1, -1);
    }

    // Handle percentage
    if (str.endsWith('%')) {
      return parseFloat(str.slice(0, -1)) / 100;
    }

    // Handle K, M, B suffixes
    const suffixMultipliers = {
      k: 1000,
      K: 1000,
      m: 1000000,
      M: 1000000,
      b: 1000000000,
      B: 1000000000,
    };

    const lastChar = str.slice(-1);
    if (suffixMultipliers[lastChar]) {
      const num = parseFloat(str.slice(0, -1));
      return num * suffixMultipliers[lastChar];
    }

    // Parse the final number
    return parseFloat(str);
  }

  /**
   * Intelligently determine decimal places
   */
  static determineDecimals(value, options = {}) {
    const { forceDecimals, minDecimals, maxDecimals } = options;

    // If force decimals is set, use it
    if (forceDecimals === true) {
      return { min: minDecimals ?? 2, max: maxDecimals ?? 2 };
    }
    if (forceDecimals === false) {
      return { min: 0, max: 0 };
    }

    // Auto-detect based on value
    const absValue = Math.abs(value);

    // For whole numbers above 1000, typically don't show decimals
    if (absValue >= 1000 && value === Math.floor(value)) {
      return { min: 0, max: 0 };
    }

    // For values between 100-1000, show decimals only if present
    if (absValue >= 100 && absValue < 1000) {
      const hasDecimals = value !== Math.floor(value);
      return {
        min: hasDecimals ? 2 : 0,
        max: 2,
      };
    }

    // For small values (less than 100), always show 2 decimals
    if (absValue < 100) {
      return { min: 2, max: 2 };
    }

    // Default to showing 2 decimals
    return {
      min: minDecimals ?? 2,
      max: maxDecimals ?? 2,
    };
  }

  /**
   * Abbreviate large numbers (1.2K, 3.4M, etc.)
   */
  static abbreviateNumber(value, currency = 'USD') {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const currencySymbol = this.getCurrencySymbol(currency);

    // Determine the appropriate suffix and divisor
    let divisor, suffix;
    if (absValue >= 1e9) {
      divisor = 1e9;
      suffix = 'B';
    } else if (absValue >= 1e6) {
      divisor = 1e6;
      suffix = 'M';
    } else if (absValue >= 1e3) {
      divisor = 1e3;
      suffix = 'K';
    } else {
      // For small numbers, use regular formatting
      return this.format(value, { currency, abbreviate: false });
    }

    // Calculate the abbreviated value
    const abbreviated = absValue / divisor;

    // Determine decimal places for abbreviated number
    let decimals;
    if (abbreviated >= 100) {
      decimals = 0; // e.g., 125K
    } else if (abbreviated >= 10) {
      decimals = 1; // e.g., 12.5K
    } else {
      decimals = 2; // e.g., 1.25K
    }

    return `${sign}${currencySymbol}${abbreviated.toFixed(decimals)}${suffix}`;
  }

  /**
   * Get currency symbol
   */
  static getCurrencySymbol(currency) {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      INR: '₹',
      CAD: '$',
      AUD: '$',
    };
    return symbols[currency] || '$';
  }

  /**
   * Format for display in charts (compact notation)
   */
  static formatForChart(value, options = {}) {
    return this.format(value, {
      ...options,
      abbreviate: true,
    });
  }

  /**
   * Format for detailed display (full precision)
   */
  static formatDetailed(value, options = {}) {
    return this.format(value, {
      ...options,
      forceDecimals: true,
      minDecimals: 2,
      maxDecimals: 2,
    });
  }

  /**
   * Format percentage with smart decimals
   */
  static formatPercentage(value, decimals = 'auto') {
    const numValue = this.parseNumber(value);

    if (decimals === 'auto') {
      // Auto-detect decimal places for percentages
      if (numValue === Math.floor(numValue)) {
        decimals = 0;
      } else if (numValue > 10) {
        decimals = 1;
      } else {
        decimals = 2;
      }
    }

    return `${numValue.toFixed(decimals)}%`;
  }

  /**
   * Validate if a value is a valid currency amount
   */
  static isValidAmount(value) {
    const parsed = this.parseNumber(value);
    return !isNaN(parsed) && isFinite(parsed);
  }

  /**
   * Compare two currency values (useful for sorting)
   */
  static compare(a, b) {
    const numA = this.parseNumber(a);
    const numB = this.parseNumber(b);
    return numA - numB;
  }

  /**
   * Sum an array of currency values
   */
  static sum(values) {
    return values.reduce((total, val) => {
      const num = this.parseNumber(val);
      return total + (isNaN(num) ? 0 : num);
    }, 0);
  }

  /**
   * Calculate average of currency values
   */
  static average(values) {
    const validValues = values.filter((val) => this.isValidAmount(val));
    if (validValues.length === 0) return 0;
    return this.sum(validValues) / validValues.length;
  }
}

// Export for use in React components
export default SmartCurrencyFormatter;

// Named exports for common use cases
export const formatCurrency = (value, options) => SmartCurrencyFormatter.format(value, options);

export const formatCompact = (value, options) => SmartCurrencyFormatter.formatForChart(value, options);

export const formatDetailed = (value, options) => SmartCurrencyFormatter.formatDetailed(value, options);

export const parseAmount = (value) => SmartCurrencyFormatter.parseNumber(value);

export const isValidAmount = (value) => SmartCurrencyFormatter.isValidAmount(value);
