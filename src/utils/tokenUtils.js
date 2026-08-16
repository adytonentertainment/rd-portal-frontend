import { jwtDecode } from 'jwt-decode';

/**
 * Check if a JWT token is expired
 * @param {string} token - The JWT token to check
 * @returns {boolean} - True if token is expired, false otherwise
 */
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000; // Convert to seconds

    // Check if token has exp field and if it's expired
    if (decoded.exp && decoded.exp < currentTime) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true; // Treat invalid tokens as expired
  }
};

/**
 * Get the token from localStorage and check if it's valid
 * @returns {string|null} - The token if valid, null if expired or missing
 */
export const getValidToken = () => {
  const token = localStorage.getItem('token');

  if (!token || isTokenExpired(token)) {
    if (token) {
      // Remove expired token
      localStorage.removeItem('token');
    }
    return null;
  }

  return token;
};

/**
 * Clear authentication data and redirect to login
 * @param {function} navigate - React Router navigate function (optional)
 */
export const clearAuthAndRedirect = (navigate = null) => {
  localStorage.removeItem('token');

  // Only reload if not on public pages
  const publicPages = [
    '/',
    '/login',
    '/signup',
    '/signup-successful',
    '/email-confirmed',
    '/email-invalid',
    '/pricing',
    '/about',
    '/faq',
    '/services',
    '/contact',
    '/free-audit',
    '/pp',
    '/tos',
    '/imprint',
  ];
  const currentPath = window.location.pathname;

  if (!publicPages.includes(currentPath)) {
    if (navigate) {
      navigate('/login');
    } else {
      window.location.href = '/login';
    }
  }
};
