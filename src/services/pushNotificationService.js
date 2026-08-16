import axios from 'axios';
import urlJoin from 'url-join';

/**
 * Push Notification Service
 * Handles Web Push subscription, permission, and service worker registration
 */

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/**
 * Get current notification permission status
 */
export const getPermissionStatus = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted', 'denied', or 'default'
};

/**
 * Request notification permission from user
 */
export const requestPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Register the service worker
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push] Service worker registration failed:', error);
    throw error;
  }
};

/**
 * Get or wait for active service worker registration
 */
export const getServiceWorkerRegistration = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  // Check if already registered
  let registration = await navigator.serviceWorker.getRegistration();

  if (!registration) {
    registration = await registerServiceWorker();
  }

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready;

  return registration;
};

/**
 * Convert VAPID key from base64 to Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  // Check permission
  const permission = await requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Get service worker registration
  const registration = await getServiceWorkerRegistration();

  // Check for existing subscription
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Create new subscription
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });
    console.log('[Push] New subscription created');
  } else {
    console.log('[Push] Using existing subscription');
  }

  // Send subscription to backend
  await sendSubscriptionToBackend(subscription);

  return subscription;
};

/**
 * Send subscription to backend
 */
const sendSubscriptionToBackend = async (subscription) => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('User not authenticated');
  }

  const subscriptionJson = subscription.toJSON();

  try {
    const response = await axios.post(
      urlJoin(BACKEND_URL, 'push/subscribe'),
      {
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
        user_agent: navigator.userAgent,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('[Push] Subscription sent to backend:', response.data);
    return response.data;
  } catch (error) {
    console.error('[Push] Failed to send subscription to backend:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async () => {
  const registration = await navigator.serviceWorker.getRegistration();

  if (!registration) {
    return;
  }

  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  // Unsubscribe locally
  await subscription.unsubscribe();

  // Notify backend
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await axios.delete(urlJoin(BACKEND_URL, 'push/unsubscribe'), {
        params: { endpoint: subscription.endpoint },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('[Push] Unsubscribed from backend');
    } catch (error) {
      console.error('[Push] Failed to unsubscribe from backend:', error);
    }
  }
};

/**
 * Get push notification status
 */
export const getPushStatus = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    return { enabled: false, permission: getPermissionStatus() };
  }

  try {
    const response = await axios.get(urlJoin(BACKEND_URL, 'push/status'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return {
      ...response.data,
      permission: getPermissionStatus(),
      supported: isPushSupported(),
    };
  } catch (error) {
    console.error('[Push] Failed to get status:', error);
    return {
      enabled: false,
      permission: getPermissionStatus(),
      supported: isPushSupported(),
    };
  }
};

/**
 * Initialize push notifications (call on app startup/login)
 * This will register service worker and resubscribe if already permitted
 */
export const initializePush = async () => {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported');
    return false;
  }

  try {
    // Register service worker
    await registerServiceWorker();

    // If permission already granted, resubscribe
    if (Notification.permission === 'granted') {
      await subscribeToPush();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Push] Initialization failed:', error);
    return false;
  }
};

export default {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushStatus,
  initializePush,
};
