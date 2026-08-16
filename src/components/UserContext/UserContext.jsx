import { useEffect, createContext, useState, useCallback } from 'react';
import urlJoin from 'url-join';
import axios from 'axios';
import { isTokenExpired, clearAuthAndRedirect } from '../../utils/tokenUtils';
import { initializePush } from '../../services/pushNotificationService';
import { ADMIN_PERSONA, getPersona } from '../../utils/persona';
import { MOCK_WRITERS } from '../../mocks/roster';
import { statementsLive } from '../../config/featureFlags';

const UserContextProvider = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState(undefined);
  const [pushInitialized, setPushInitialized] = useState(false);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    let userData = undefined;

    // Demo mode: auto-sign-in based on the active persona.
    //   - 'admin' (default)  → publisher-admin user, sees admin dashboard
    //   - <writer id>        → writer user, sees their own portal
    const persona = getPersona();
    const ADMIN_USER = {
      id: 6,
      username: 'demo',
      email: 'demo@demo.local',
      first_name: 'Demo',
      last_name: 'Admin',
      account_activated: true,
      activated: true,
    };
    const writerForPersona = () => {
      const writer = MOCK_WRITERS.find((w) => String(w.id) === String(persona));
      if (!writer) return null;
      const slug = writer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const [first, ...rest] = writer.name.split(' ');
      return {
        id: writer.id,
        username: slug,
        email: `${slug}@portal.rd`,
        first_name: first,
        last_name: rest.join(' '),
        account_activated: true,
        activated: true,
      };
    };
    const DEMO_USER = persona === ADMIN_PERSONA ? ADMIN_USER : writerForPersona() || ADMIN_USER;
    // In live mode there is NO demo auto-sign-in: a missing/expired token means
    // logged-out (null), so /login and logout actually take effect. The demo
    // persona fallback only applies to the localStorage-only demo build.
    const NO_SESSION = statementsLive ? null : DEMO_USER;

    if (!token) {
      setUser(NO_SESSION);
      return;
    }

    if (isTokenExpired(token)) {
      setUser(NO_SESSION);
      return;
    }

    try {
      // First verify the token. The token goes in the Authorization header,
      // never in the URL — request lines end up verbatim in server access logs,
      // which is how live session tokens leaked to disk.
      const verifyResponse = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/verify-token'),
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      // Then fetch the full user profile to get account_activated status
      const profileResponse = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      // And the Verax account role — the authoritative answer to "is this an
      // admin?". A pending (unapproved) admin comes back is_admin=false, so the
      // UI locks them out exactly like the backend does. Tolerate a 404 so an
      // older backend without this endpoint still logs the user in.
      let account = {};
      try {
        const accountResponse = await axios({
          url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/me/account'),
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        account = accountResponse.data || {};
      } catch {
        account = {};
      }

      // Merge token data with profile data + role/approval
      userData = {
        ...verifyResponse.data,
        ...profileResponse.data,
        ...account,
      };
    } catch {
      // Live mode: a token that fails to verify (invalid/expired/backend down)
      // means logged-out, so re-login is required. Demo mode falls back to the
      // demo user so the localStorage-only build keeps working offline.
      userData = statementsLive ? null : DEMO_USER;
    } finally {
      setUser(userData ?? NO_SESSION);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Initialize push notifications when user is logged in
  useEffect(() => {
    if (user && !pushInitialized) {
      initializePush()
        .then((success) => {
          if (success) {
            console.log('[Push] Notifications initialized');
          }
          setPushInitialized(true);
        })
        .catch((error) => {
          console.error('[Push] Failed to initialize:', error);
          setPushInitialized(true);
        });
    }
  }, [user, pushInitialized]);

  // Check token when user returns to the tab/window
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('token');
        if (token && isTokenExpired(token)) {
          console.log('Token expired while tab was inactive, logging out');
          clearAuthAndRedirect();
          setUser(null);
        } else if (token && user) {
          // Token exists and is valid, optionally refresh user data
          fetchUser();
        }
      }
    };

    const handleFocus = () => {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        console.log('Token expired while window was unfocused, logging out');
        clearAuthAndRedirect();
        setUser(null);
      } else if (token && user) {
        // Token exists and is valid, optionally refresh user data
        fetchUser();
      }
    };

    // Listen for visibility changes (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Listen for window focus (window switching)
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchUser]);

  return (
    <UserContextProvider.Provider value={user}>{user === undefined ? <></> : children}</UserContextProvider.Provider>
  );
};

export { UserContext, UserContextProvider };
