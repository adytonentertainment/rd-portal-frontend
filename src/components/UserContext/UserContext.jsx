import { useEffect, createContext, useState, useCallback } from 'react';
import urlJoin from 'url-join';
import axios from 'axios';
import { ADMIN_PERSONA, getPersona } from '../../utils/persona';
import { MOCK_WRITERS } from '../../mocks/roster';
import { demoAutoLogin } from '../../config/featureFlags';

const UserContextProvider = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState(undefined);

  const fetchUser = useCallback(async () => {
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
      is_admin: true,
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
        is_admin: false,
      };
    };
    const DEMO_USER = persona === ADMIN_PERSONA ? ADMIN_USER : writerForPersona() || ADMIN_USER;
    // Live mode, and a production build that forgot the live flag, do not
    // auto-sign-in. No valid session means logged-out. The demo persona is
    // local development, or a demo deploy that sets REACT_APP_DEMO_AUTO_LOGIN=1.
    const NO_SESSION = demoAutoLogin ? DEMO_USER : null;

    try {
      // The session is an HttpOnly cookie the page cannot read, so the only way
      // to know whether someone is signed in is to ask the API.
      const verifyResponse = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/verify-token'),
        method: 'GET',
        headers: { accept: 'application/json' },
      });

      // Then fetch the full user profile to get account_activated status
      const profileResponse = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
        method: 'GET',
        headers: { accept: 'application/json' },
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
          headers: { accept: 'application/json' },
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
      // No session, an expired one, or one ended by a password change: signed
      // out. Demo auto-login still substitutes the demo user when that mode is on.
      userData = demoAutoLogin ? DEMO_USER : null;
    } finally {
      setUser(userData ?? NO_SESSION);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Re-check the session when a signed-in user returns to the tab: it may have
  // expired, or ended because the password changed elsewhere. A null user sends
  // protected pages back to the login screen.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) fetchUser();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, fetchUser]);

  return (
    <UserContextProvider.Provider value={user}>{user === undefined ? <></> : children}</UserContextProvider.Provider>
  );
};

export { UserContext, UserContextProvider };
