import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Dashboard routes where Crisp should be shown (routes with sidebar)
const DASHBOARD_ROUTES = [
  '/catalog',
  '/earnings',
  '/tunescan',
  '/settings',
  '/notifications',
  '/chart-demo',
  '/agreements',
];

const CrispChat = () => {
  const location = useLocation();

  useEffect(() => {
    // Check if current route is a dashboard route
    const isDashboardRoute = DASHBOARD_ROUTES.some((route) => location.pathname.startsWith(route));

    if (isDashboardRoute) {
      // Initialize Crisp if not already initialized
      if (!window.$crisp) {
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = 'f5839fef-13c8-4ab0-887e-e966fa62d052';
        window.CRISP_RUNTIME_CONFIG = {
          theme_color: '#a67c52',
        };

        // Load Crisp script
        const script = document.createElement('script');
        script.src = 'https://client.crisp.chat/l.js';
        script.async = true;
        document.getElementsByTagName('head')[0].appendChild(script);
      } else {
        // Show Crisp if it was hidden
        window.$crisp.push(['do', 'chat:show']);
      }
    } else {
      // Hide Crisp on non-dashboard routes
      if (window.$crisp) {
        window.$crisp.push(['do', 'chat:hide']);
      }
    }
  }, [location.pathname]);

  return null; // This component doesn't render anything
};

export default CrispChat;
