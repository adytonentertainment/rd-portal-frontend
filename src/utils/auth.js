import { useContext } from 'react';
import { UserContextProvider } from '../components/UserContext/UserContext';

/**
 * Demo-mode admin emails. Only used when there is no real signed-in account
 * (persona demo, no token). Real accounts are authorized by the BACKEND —
 * see is_admin from /auth/me/account, merged onto the user by UserContext.
 */
const ADMIN_EMAILS = ['demo@demo.local', 'steven@verax.app'];

/**
 * Check if an email address belongs to a demo admin
 * @param {string} email - The email to check
 * @returns {boolean} - True if the email is in the demo admin list
 */
export const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * Hook to check if the current user is an admin.
 *
 * Source of truth order:
 *   1. `is_admin` from the backend account (role='admin' AND approved). This is
 *      authoritative — a *pending* admin is is_admin=false and stays locked out.
 *   2. Demo fallback: the hardcoded email list, used only when the user has no
 *      backend account attached (persona demo mode).
 *
 * @returns {boolean}
 */
export const useIsAdmin = () => {
  const user = useContext(UserContextProvider);
  if (!user) return false;
  if (typeof user.is_admin === 'boolean') return user.is_admin;
  if (!user.email) return false;
  return isAdminEmail(user.email);
};

/**
 * True when the user registered as an admin but is still awaiting approval.
 * @returns {boolean}
 */
export const useIsPendingAdmin = () => {
  const user = useContext(UserContextProvider);
  return Boolean(user && user.pending_admin_approval);
};
