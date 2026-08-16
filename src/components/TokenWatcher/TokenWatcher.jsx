import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isTokenExpired, clearAuthAndRedirect } from '../../utils/tokenUtils';

/**
 * Component that watches for token expiration on route changes
 * Must be rendered inside BrowserRouter
 */
const TokenWatcher = () => {
  const location = useLocation();

  // Check token on route change
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      clearAuthAndRedirect();
    }
  }, [location.pathname]);

  return null; // This component doesn't render anything
};

export default TokenWatcher;
