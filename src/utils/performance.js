/**
 * Performance optimization utilities for React
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Debounce hook - delays execution until after wait time
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

/**
 * Throttle hook - limits execution to once per wait time
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Delay in milliseconds
 */
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay]
  );
};

/**
 * Lazy load images - improves initial page load
 */
export const lazyLoadImage = (src, placeholder = '/placeholder.png') => {
  return {
    src: placeholder,
    'data-src': src,
    loading: 'lazy',
  };
};

/**
 * Measure component render performance
 */
export const usePerformanceMonitor = () => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    // Performance monitoring disabled
  });
};

/**
 * Memoize expensive computations
 */
export const memoize = (fn) => {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};
