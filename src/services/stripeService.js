import axios from 'axios';
import urlJoin from 'url-join';

/**
 * Get the appropriate Stripe publishable key based on user's subscription mode
 * @returns {Promise<{publishableKey: string, mode: string}>}
 */
export const getStripePublishableKey = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, 'stripe/publishable-key'), {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    return {
      publishableKey: response.data.publishableKey,
      mode: response.data.mode,
    };
  } catch (error) {
    console.error('Failed to get Stripe publishable key:', error);
    // Fallback to environment variable if API fails
    return {
      publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
      mode: 'test',
    };
  }
};

/**
 * Create a checkout session for subscription
 * @param {string} tier - The subscription tier
 * @param {string} redirectUrl - URL to redirect after checkout
 * @returns {Promise<string>} Checkout session URL
 */
export const createCheckoutSession = async (tier, redirectUrl = window.location.origin) => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, `stripe/checkout-session`), {
      params: {
        tier: tier.toLowerCase(),
        redirect_url: redirectUrl,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw error;
  }
};

/**
 * Get user's subscription data
 * @returns {Promise<Object>} Subscription data
 */
export const getUserSubscription = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, 'stripe/subscription'), {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to get subscription data:', error);
    throw error;
  }
};

/**
 * Open billing portal for subscription management
 * @param {string} redirectUrl - URL to redirect after portal session
 * @returns {Promise<string>} Billing portal URL
 */
export const openBillingPortal = async (redirectUrl = window.location.origin) => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('User not authenticated');
  }

  try {
    const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, 'stripe/billing-portal'), {
      params: {
        redirect_url: redirectUrl,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to open billing portal:', error);
    throw error;
  }
};
