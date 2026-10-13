import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaDollarSign,
  FaCog,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaCheck,
  FaHome,
  FaFileInvoiceDollar,
  FaMoneyCheckAlt,
  FaUsers,
} from 'react-icons/fa';
import { useIsAdmin } from '../../utils/auth';
import { statementsLive } from '../../config/featureFlags';
import VeraxLogo from '../VeraxLogo/VeraxLogo';
import Tooltip from '@mui/material/Tooltip';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import { useClientContext } from '../ClientContext/ClientContext';
import styles from './sidebar.module.css';
import { useLanguage } from '../../i18n/LanguageContext';

// Writer-facing nav labels follow the portal language switch; admin nav stays
// English (the admin UI is not translated).
const Sidebar = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useContext(ThemeContext);
  const isAdmin = useIsAdmin();
  const { selectedClientId } = useClientContext();

  const handleSignOut = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const toggleTheme = () => {
    theme.toggleTheme();
  };

  const writerMenuItems = [
    {
      icon: <FaDollarSign size={20} />,
      label: t('nav.royalties'),
      path: '/earnings',
      id: 'earnings',
      disabled: false,
    },
    {
      icon: <FaFileInvoiceDollar size={18} />,
      label: t('nav.statements'),
      path: '/statements',
      id: 'statements',
      disabled: false,
    },
  ];

  const adminMenuItems = [
    {
      icon: <FaHome size={19} />,
      label: 'Dashboard',
      path: '/admin',
      id: 'admin-dashboard',
      disabled: false,
    },
    {
      icon: <FaUsers size={20} />,
      label: 'Clients',
      path: '/admin/writers',
      id: 'admin-writers',
      disabled: false,
    },
    {
      icon: <FaFileInvoiceDollar size={18} />,
      label: 'Statements',
      path: '/admin/statements',
      id: 'admin-statements',
      disabled: false,
    },
    {
      icon: <FaMoneyCheckAlt size={18} />,
      label: 'Distributions',
      path: '/admin/distributions',
      id: 'admin-distributions',
      disabled: false,
    },
    {
      icon: <FaCheck size={18} />,
      label: 'Accounts',
      path: '/admin/accounts',
      id: 'admin-accounts',
      disabled: false,
    },
  ];

  // In live mode a writer's portal is the earnings overview + their statements.
  // Catalog and Usage are demo-only estimator pages, so hide those two.
  const liveWriterMenuItems = writerMenuItems.filter((m) => m.id === 'earnings' || m.id === 'statements');
  const menuItems = isAdmin ? adminMenuItems : statementsLive ? liveWriterMenuItems : writerMenuItems;

  const isActive = (path) => {
    // /admin is the Dashboard item — exact match only, so it isn't also
    // highlighted when a sub-page (/admin/writers, /admin/statements…) is open.
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    // For other admin paths, use startsWith to handle sub-routes
    if (path.startsWith('/admin/')) {
      return location.pathname.startsWith(path);
    }
    return location.pathname === path;
  };

  return (
    <div className={styles.container}>
      {/* Logo Section */}
      <div className={styles.logo}>
        <VeraxLogo height={36} />
      </div>

      {/* Navigation Items */}
      <nav className={styles.nav}>
        {menuItems
          .filter((item) => !(item.id === 'usage' && selectedClientId !== null && isAdmin))
          .map((item) => (
            <Tooltip key={item.id} title={item.label} placement="right" arrow>
              <button
                className={`${styles.item} ${isActive(item.path) ? styles.itemActive : ''} ${item.disabled ? styles.itemDisabled : ''}`}
                onClick={() => !item.disabled && navigate(item.path)}
                disabled={item.disabled}
              >
                <div className={styles.itemIcon}>{item.icon}</div>
                <span className={styles.itemLabel}>{item.label}</span>
              </button>
            </Tooltip>
          ))}
      </nav>

      {/* Bottom Section - Theme Toggle, Settings, and Sign Out */}
      <div className={styles.bottom}>
        <Tooltip title={theme.currentTheme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')} placement="right" arrow>
          <button className={styles.item} onClick={toggleTheme}>
            <div className={styles.itemIcon}>
              {theme.currentTheme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
            </div>
            <span className={styles.itemLabel}>{theme.currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </Tooltip>

        <Tooltip title={t('nav.settings')} placement="right" arrow>
          <button
            className={`${styles.item} ${isActive('/settings') ? styles.itemActive : ''}`}
            onClick={() => navigate('/settings')}
          >
            <div className={styles.itemIcon}>
              <FaCog size={18} />
            </div>
            <span className={styles.itemLabel}>{t('nav.settings')}</span>
          </button>
        </Tooltip>

        <Tooltip title={t('nav.signOut')} placement="right" arrow>
          <button className={styles.item} onClick={handleSignOut}>
            <div className={styles.itemIcon}>
              <FaSignOutAlt size={18} />
            </div>
            <span className={styles.itemLabel}>{t('nav.signOut')}</span>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Sidebar;
