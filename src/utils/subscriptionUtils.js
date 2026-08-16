/**
 * Utility functions for managing subscription updates
 */

/**
 * Trigger a subscription data refresh across the application
 * Call this after any action that affects subscription usage:
 * - Uploading/scanning a track
 * - Adding a track to catalog
 * - Deleting scans or catalog items
 */
export const triggerSubscriptionUpdate = () => {
  window.dispatchEvent(new CustomEvent('subscriptionUpdated'));
};

/**
 * Hook to listen for subscription updates
 * @param {Function} callback - Function to call when subscription is updated
 * @returns {Function} cleanup function
 */
export const onSubscriptionUpdate = (callback) => {
  window.addEventListener('subscriptionUpdated', callback);
  return () => window.removeEventListener('subscriptionUpdated', callback);
};
