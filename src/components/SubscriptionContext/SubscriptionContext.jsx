import { useEffect, createContext, useState, useCallback } from 'react';
import urlJoin from 'url-join';
import axios from 'axios';

const SubscriptionContextProvider = createContext();

const SubscriptionContext = ({ children }) => {
  const [subscription, setSubscription] = useState(undefined);

  const fetchSubscriptionData = useCallback(async () => {
    // Demo mode: every persona gets Enterprise. No paywalls anywhere.
    const DEMO_SUBSCRIPTION = {
      tier: 'Enterprise',
      stripe_status: 'active',
      stripe_mode: 'test',
      billing_interval: 'year',
      scans: 999999,
      catalog_added_count: 0,
      limit_exceeded: false,
    };
    const token = localStorage.getItem('token');
    if (!token) {
      setSubscription(DEMO_SUBSCRIPTION);
      return;
    }
    try {
      const response = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, `/stripe/subscription`),
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200 && response.data && response.data.tier) {
        setSubscription(response.data);
      } else {
        setSubscription(DEMO_SUBSCRIPTION);
      }
    } catch {
      setSubscription(DEMO_SUBSCRIPTION);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();

    // Listen for subscription update events
    const handleSubscriptionUpdate = () => {
      fetchSubscriptionData();
    };

    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);

    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, [fetchSubscriptionData]);

  // Provide both subscription data and refresh function
  const value = {
    subscription,
    refreshSubscription: fetchSubscriptionData,
  };

  return (
    <SubscriptionContextProvider.Provider value={value}>
      {subscription === undefined ? <></> : children}
    </SubscriptionContextProvider.Provider>
  );
};

export { SubscriptionContext, SubscriptionContextProvider };
