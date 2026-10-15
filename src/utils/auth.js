import { useContext } from 'react';
import { UserContextProvider } from '../components/UserContext/UserContext';

/**
 * Hook to check if the current user is an admin.
 *
 * `is_admin` comes from the backend account (role='admin' AND approved). A
 * pending admin is is_admin=false and stays locked out. A missing value fails
 * closed: the UI does not guess from the email address. The demo persona sets
 * the flag itself.
 *
 * @returns {boolean}
 */
export const useIsAdmin = () => {
  const user = useContext(UserContextProvider);
  return user?.is_admin === true;
};

/**
 * True when the user registered as an admin but is still awaiting approval.
 * @returns {boolean}
 */
export const useIsPendingAdmin = () => {
  const user = useContext(UserContextProvider);
  return Boolean(user && user.pending_admin_approval);
};
