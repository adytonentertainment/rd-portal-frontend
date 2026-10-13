import { createContext } from 'react';

const SubscriptionContextProvider = createContext();

// The publisher portal has no billing: every account gets the top tier, so no
// paywall from the old SaaS product ever applies. Kept as a context because
// pages from that product still read it.
const SUBSCRIPTION = {
  tier: 'Enterprise',
  scans: 999999,
  catalog_added_count: 0,
  limit_exceeded: false,
};

const VALUE = { subscription: SUBSCRIPTION, refreshSubscription: () => {} };

const SubscriptionContext = ({ children }) => (
  <SubscriptionContextProvider.Provider value={VALUE}>{children}</SubscriptionContextProvider.Provider>
);

export { SubscriptionContext, SubscriptionContextProvider };
