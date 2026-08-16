import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaDollarSign,
  FaCog,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaPlus,
  FaCheck,
  FaHome,
  FaFileInvoiceDollar,
  FaMoneyCheckAlt,
  FaUsers,
} from 'react-icons/fa';
import { HiUsers } from 'react-icons/hi2';
import { useIsAdmin } from '../../utils/auth';
import { statementsLive } from '../../config/featureFlags';
import VeraxLogo from '../VeraxLogo/VeraxLogo';
import Tooltip from '@mui/material/Tooltip';
import { CircularProgress } from '@mui/material';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import { useClientContext } from '../ClientContext/ClientContext';
import styles from './sidebar.module.css';
import { useLanguage } from '../../i18n/LanguageContext';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Tiers that can have multiple clients (Enterprise only)
const MULTI_CLIENT_TIERS = ['Enterprise'];

// Writer-facing nav labels follow the portal language switch; admin nav stays
// English (the admin UI is not translated).
const Sidebar = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useContext(ThemeContext);
  const isAdmin = useIsAdmin();
  const {
    clients,
    selectedClientId,
    selectedClient,
    selectClient,
    clearSelection,
    createClient,
    loading: clientsLoading,
  } = useClientContext();
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientColor, setNewClientColor] = useState('#3b82f6');
  const [creatingClient, setCreatingClient] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const clientColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444', '#6366f1'];

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/auth/user/subscription`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch {
        // Silently fail - subscription data is not critical
      }
    };

    fetchSubscription();
  }, []);

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

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    try {
      await createClient({ name: newClientName.trim(), color: newClientColor });
      setNewClientName('');
      setShowAddClient(false);
    } catch (error) {
      console.error('Failed to create client:', error);
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Logo Section */}
      <div className={styles.logo}>
        <VeraxLogo height={36} />
      </div>

      {/* Client Selector - Only visible for Elite/Enterprise tiers */}
      {subscription && MULTI_CLIENT_TIERS.includes(subscription.tier) && (
        <div
          className={styles.clientSelectorWrapper}
          onMouseEnter={() => setShowClientDropdown(true)}
          onMouseLeave={() => {
            setShowClientDropdown(false);
            setShowAddClient(false);
          }}
        >
          <Tooltip title={selectedClient ? selectedClient.name : 'Publisher Account'} placement="right">
            <button className={styles.clientSelector}>
              {clientsLoading ? (
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
              ) : selectedClient ? (
                <div className={styles.clientDot} style={{ backgroundColor: selectedClient.color }} />
              ) : (
                <HiUsers size={18} />
              )}
            </button>
          </Tooltip>

          {/* Client Dropdown */}
          {showClientDropdown && (
            <div className={styles.clientDropdown}>
              <div className={styles.clientDropdownHeader}>Clients</div>
              <div className={styles.clientList}>
                {/* Publisher-wide (no client filter) */}
                <button
                  className={`${styles.clientOption} ${!selectedClientId ? styles.clientOptionActive : ''}`}
                  onClick={() => clearSelection()}
                >
                  <HiUsers size={16} />
                  <span>Publisher Account</span>
                  {!selectedClientId && <FaCheck size={12} className={styles.checkIcon} />}
                </button>

                {/* Individual Clients */}
                {clients.map((client) => (
                  <button
                    key={client.id}
                    className={`${styles.clientOption} ${selectedClientId === client.id ? styles.clientOptionActive : ''}`}
                    onClick={() => selectClient(client.id)}
                  >
                    <div className={styles.clientDot} style={{ backgroundColor: client.color }} />
                    <span>{client.name}</span>
                    {selectedClientId === client.id && <FaCheck size={12} className={styles.checkIcon} />}
                  </button>
                ))}
              </div>

              {/* Add Client Section */}
              {!showAddClient ? (
                <button className={styles.addClientButton} onClick={() => setShowAddClient(true)}>
                  <FaPlus size={12} />
                  <span>Add Client</span>
                </button>
              ) : (
                <div className={styles.addClientForm}>
                  <input
                    type="text"
                    placeholder="Client name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className={styles.addClientInput}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateClient()}
                  />
                  <div className={styles.colorPicker}>
                    {clientColors.map((color) => (
                      <button
                        key={color}
                        className={`${styles.colorOption} ${newClientColor === color ? styles.colorOptionActive : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewClientColor(color)}
                      />
                    ))}
                  </div>
                  <button
                    className={styles.createClientButton}
                    onClick={handleCreateClient}
                    disabled={!newClientName.trim() || creatingClient}
                  >
                    {creatingClient ? <CircularProgress size={14} sx={{ color: 'white' }} /> : 'Create'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <span className={styles.itemLabel}>Settings</span>
          </button>
        </Tooltip>

        <Tooltip title={t('nav.signOut')} placement="right" arrow>
          <button className={styles.item} onClick={handleSignOut}>
            <div className={styles.itemIcon}>
              <FaSignOutAlt size={18} />
            </div>
            <span className={styles.itemLabel}>Sign Out</span>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Sidebar;
