/**
 * Production-safe logger utility
 * Automatically disables console logs in production
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const logger = {
  log: (...args) => {
    if (!IS_PRODUCTION) {
      console.log(...args);
    }
  },

  debug: (...args) => {
    if (!IS_PRODUCTION) {
      console.debug(...args);
    }
  },

  info: (...args) => {
    if (!IS_PRODUCTION) {
      console.info(...args);
    }
  },

  warn: (...args) => {
    if (!IS_PRODUCTION) {
      console.warn(...args);
    }
  },

  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },

  table: (...args) => {
    if (!IS_PRODUCTION) {
      console.table(...args);
    }
  },
};

export default logger;
