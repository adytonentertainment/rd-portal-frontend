import axios from 'axios';
import { baseUrl } from './client';

// The browser session is an HttpOnly cookie set by the API on login,
// registration and invite acceptance. No script on the portal can read it, so
// nothing here stores or forwards a token: requests just carry credentials.
//
// X-Requested-With is the API's CSRF check for cookie-authenticated writes: a
// page on another origin cannot add it without a CORS preflight the API refuses.

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/signup',
  '/signup-successful',
  '/email-confirmed',
  '/email-invalid',
  '/page-message',
  '/pp',
  '/tos',
  '/imprint',
  '/resetPassword',
  '/forgotPassword',
];

const isPublicPath = (path) => PUBLIC_PATHS.includes(path) || path.startsWith('/invite/');

// A session that ended mid-use (expired, or the password changed elsewhere).
const sessionEnded = (error) => {
  const status = error && error.response && error.response.status;
  const detail = error && error.response && error.response.data && error.response.data.detail;
  return status === 401 || (status === 403 && detail === 'Token is invalid or expired');
};

export const redirectToLogin = () => {
  const { pathname, search } = window.location;
  if (isPublicPath(pathname)) return;
  window.location.href = `/login?redirect=${encodeURIComponent(pathname + search)}`;
};

let configured = false;

export const configureHttp = () => {
  if (configured) return;
  configured = true;
  axios.defaults.withCredentials = true;
  axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  axios.interceptors.response.use(undefined, (error) => {
    // The session check itself reports "logged out"; only a session that dies
    // while a protected page is open sends the user back to the login screen.
    const url = (error && error.config && error.config.url) || '';
    const isSessionProbe = /\/auth\/(verify-token|user|me\/account|token|logout)$/.test(url);
    if (sessionEnded(error) && !isSessionProbe) redirectToLogin();
    return Promise.reject(error);
  });
  // Sessions from before the cookie change kept a token in localStorage.
  try {
    localStorage.removeItem('token');
  } catch {
    // storage unavailable (private mode): nothing to clean up
  }
};

export const logout = async () => {
  try {
    await axios.post(`${baseUrl()}/auth/logout`);
  } catch {
    // Already signed out or unreachable: the login page is still the right place.
  }
  window.location.replace('/login');
};
