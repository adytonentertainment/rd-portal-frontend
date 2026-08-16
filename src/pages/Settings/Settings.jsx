import { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';
import axios from 'axios';
import NavBar from '../../components/NavBar/NavBar';
import { UserContextProvider } from '../../components/UserContext/UserContext';
import { SubscriptionContextProvider } from '../../components/SubscriptionContext/SubscriptionContext';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { useClientContext } from '../../components/ClientContext/ClientContext';
import styles from './settings.module.css';
import { Helmet } from 'react-helmet-async';
import { validatePassword } from '../../utils/passwordValidator';

const Settings = () => {
  const navigate = useNavigate();
  const user = useContext(UserContextProvider);
  const subscriptionContext = useContext(SubscriptionContextProvider);
  const subscription = subscriptionContext?.subscription;
  const { currentTheme } = useContext(ThemeContext);
  const { selectedClient, selectedClientId, updateClient } = useClientContext();

  const [selectedTab, setSelectedTab] = useState('account');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    // TuneScan notifications
    scan_complete: { push: true, email: true, web: true },
    new_match: { push: true, email: true, web: true },
    unauthorized_use: { push: true, email: true, web: true },
    // Revenue notifications
    statement_processed: { push: true, email: true, web: true },
    revenue_discrepancy: { push: true, email: true, web: true },
    revenue_spike: { push: true, email: true, web: true },
    revenue_leak: { push: true, email: true, web: true },
    // Catalog notifications
    milestone: { push: true, email: true, web: true },
    trending: { push: true, email: true, web: true },
    catalog_update: { push: false, email: true, web: true },
    // Agreement notifications
    agreement_parsed: { push: true, email: true, web: true },
    critical_red_flag: { push: true, email: true, web: true },
    termination_expiring: { push: true, email: true, web: true },
    // Reports
    weekly_report: { push: false, email: true, web: true },
  });

  const oldPasswordRef = useRef();
  const newPasswordRef = useRef();
  const confirmNewPasswordRef = useRef();
  const firstNameRef = useRef();
  const lastNameRef = useRef();
  const writerIpiRef = useRef();
  const writerNameRef = useRef();
  const publisherIpiRef = useRef();
  const publisherNameRef = useRef();
  const avatarInputRef = useRef();

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await axios({
          method: 'GET',
          url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 200) {
          setUserInfo(response.data);
          // Set the input field values
          if (firstNameRef.current) firstNameRef.current.value = response.data.first_name || '';
          if (lastNameRef.current) lastNameRef.current.value = response.data.last_name || '';
          setAvatarUrl(response.data.avatar_url);

          // Populate IPI/name fields from selected client or user
          if (selectedClient) {
            if (writerIpiRef.current) writerIpiRef.current.value = selectedClient.writer_ipi || '';
            if (writerNameRef.current) writerNameRef.current.value = selectedClient.writer_name || '';
            if (publisherIpiRef.current) publisherIpiRef.current.value = selectedClient.publisher_ipi || '';
            if (publisherNameRef.current) publisherNameRef.current.value = selectedClient.publisher_name || '';
          } else {
            if (writerIpiRef.current) writerIpiRef.current.value = response.data.writer_ipi || '';
            if (writerNameRef.current) writerNameRef.current.value = response.data.writer_name || '';
            if (publisherIpiRef.current) publisherIpiRef.current.value = response.data.publisher_ipi || '';
            if (publisherNameRef.current) publisherNameRef.current.value = response.data.publisher_name || '';
          }

          // Fetch notification preferences
          if (response.data.notification_preferences) {
            setNotificationPrefs(response.data.notification_preferences);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // If unauthorized, redirect to login
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.clear();
          navigate('/');
        }
      }
    };

    fetchUserInfo();
  }, [navigate, selectedClient]);

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      const response = await axios({
        method: 'DELETE',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 204) {
        // Clear all authentication data
        localStorage.clear();
        sessionStorage.clear();

        // Use replace to prevent back navigation
        window.location.replace(urlJoin(process.env.REACT_APP_FRONTEND_URL, '/login'));
      }
    } catch (error) {
      console.error('Error deleting account:', error);

      // Even if there's an error, if it's a 401/403, clear auth data
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/login');
      }
    }
  };

  const handleChangePassword = async () => {
    if (newPasswordRef.current.value !== confirmNewPasswordRef.current.value) {
      alert('Passwords do not match');
      return;
    }

    // Validate password strength
    const validation = validatePassword(newPasswordRef.current.value);
    if (!validation.isValid) {
      alert('Password does not meet requirements:\n' + validation.errors.join('\n'));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    try {
      const response = await axios({
        method: 'POST',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/change-password'),
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          password_old: oldPasswordRef.current.value,
          password_new: newPasswordRef.current.value,
        },
      });
      if (response.status === 200) {
        alert('Password changed successfully');
        oldPasswordRef.current.value = '';
        newPasswordRef.current.value = '';
        confirmNewPasswordRef.current.value = '';
      }
    } catch (error) {
      console.error('Error changing password:', error);
      // Show backend validation errors if available
      const errorDetail = error.response?.data?.detail;
      if (errorDetail) {
        alert('Failed to change password: ' + errorDetail);
      } else {
        alert('Failed to change password');
      }
    }
  };

  const handleOpenBillingSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    try {
      const response = await axios({
        method: 'GET',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'stripe/billing-portal'),
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        window.location.href = response.data;
      }
    } catch (error) {
      console.error('Error opening billing session:', error);
    }
  };

  const handleSaveAccount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    try {
      // Save user account fields (first name, last name)
      const response = await axios({
        method: 'PATCH',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          first_name: firstNameRef.current?.value || null,
          last_name: lastNameRef.current?.value || null,
          // Only save IPI/name to user when no client is selected
          ...(!selectedClientId && {
            writer_ipi: writerIpiRef.current?.value || null,
            writer_name: writerNameRef.current?.value || null,
            publisher_ipi: publisherIpiRef.current?.value || null,
            publisher_name: publisherNameRef.current?.value || null,
          }),
        },
      });

      // Save IPI/name to selected client if one is active
      if (selectedClientId) {
        await updateClient(selectedClientId, {
          writer_ipi: writerIpiRef.current?.value || null,
          writer_name: writerNameRef.current?.value || null,
          publisher_ipi: publisherIpiRef.current?.value || null,
          publisher_name: publisherNameRef.current?.value || null,
        });
      }

      if (response.status === 200) {
        setUserInfo(response.data);
        // Clear audit cache so it refetches with new IPI/name
        localStorage.removeItem('verax_audit_cache_v1');
        localStorage.setItem('verax_settings_modified_at', Date.now().toString());
        alert('Account information saved successfully');
      }
    } catch (error) {
      console.error('Error saving account information:', error);
      alert('Failed to save account information');
    }
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios({
        method: 'POST',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user/avatar'),
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: formData,
      });

      if (response.status === 200) {
        setAvatarUrl(urlJoin(process.env.REACT_APP_BACKEND_URL, response.data.avatar_url));
        alert('Avatar uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar');
    }
  };

  return (
    <>
      <Helmet>
        <title>Settings | RD</title>
      </Helmet>
      <NavBar />
      <div className={styles.settingsContainer} data-theme={currentTheme}>
        <div className={styles.settingsWrapper}>
          {/* Sidebar Menu */}
          <div className={styles.sidebar}>
            <h2 className={styles.settingsTitle}>Settings</h2>

            <div className={styles.menuSection}>
              <h3 className={styles.menuSectionTitle}>Personal</h3>
              <button
                className={`${styles.menuItem} ${selectedTab === 'account' ? styles.menuItemSelected : ''}`}
                onClick={() => setSelectedTab('account')}
              >
                <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Account
              </button>
              <button
                className={`${styles.menuItem} ${selectedTab === 'api' ? styles.menuItemSelected : ''}`}
                onClick={() => setSelectedTab('api')}
              >
                <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                API Keys
              </button>
              <button
                className={`${styles.menuItem} ${selectedTab === 'notifications' ? styles.menuItemSelected : ''}`}
                onClick={() => setSelectedTab('notifications')}
              >
                <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                Notifications
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {selectedTab === 'account' && (
              <div className={styles.contentSection}>
                <div className={styles.header}>
                  <h1 className={styles.pageTitle}>Account</h1>
                  <p className={styles.pageSubtitle}>Update your profile and personal details here</p>
                </div>

                {/* Profile Section */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Profile</h2>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Avatar</label>
                    <div className={styles.avatarGroup}>
                      <div className={styles.avatar}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className={styles.avatarImage} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        )}
                      </div>
                      <div className={styles.avatarActions}>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          style={{ display: 'none' }}
                        />
                        <button className={styles.uploadButton} onClick={handleAvatarClick}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          Upload
                        </button>
                        <p className={styles.helpText}>For best results, upload an image 512x512 or larger.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label className={styles.label}>First name</label>
                      <input ref={firstNameRef} className={styles.input} type="text" placeholder="Josef" />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.label}>Last name</label>
                      <input ref={lastNameRef} className={styles.input} type="text" placeholder="Albers" />
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Email</label>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder={user?.email || 'email@example.com'}
                      disabled
                    />
                  </div>

                  {selectedClient && (
                    <p
                      className={styles.helpText}
                      style={{ marginBottom: '8px', fontWeight: 500, color: selectedClient.color || 'var(--accent)' }}
                    >
                      Editing IPI & publishing info for client: {selectedClient.name}
                    </p>
                  )}

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Writer Name <span className={styles.labelOptional}>(Optional)</span>
                    </label>
                    <input ref={writerNameRef} className={styles.input} type="text" placeholder="e.g., John Smith" />
                    <p className={styles.helpText}>Your name as registered with your performing rights organization</p>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Writer IPI <span className={styles.labelOptional}>(Optional)</span>
                    </label>
                    <input
                      ref={writerIpiRef}
                      className={styles.input}
                      type="text"
                      placeholder="e.g., 00123456789"
                      maxLength="11"
                    />
                    <p className={styles.helpText}>
                      Your songwriter IPI number from your performing rights organization (BMI, ASCAP, PRS, SOCAN, etc.)
                    </p>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Publisher Name <span className={styles.labelOptional}>(Optional)</span>
                    </label>
                    <input
                      ref={publisherNameRef}
                      className={styles.input}
                      type="text"
                      placeholder="e.g., My Publishing Company"
                    />
                    <p className={styles.helpText}>Your publishing company or entity name</p>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>
                      Publisher IPI <span className={styles.labelOptional}>(Optional)</span>
                    </label>
                    <input
                      ref={publisherIpiRef}
                      className={styles.input}
                      type="text"
                      placeholder="e.g., 00123456789"
                      maxLength="11"
                    />
                    <p className={styles.helpText}>
                      Your publisher's IPI number from your performing rights organization
                    </p>
                  </div>

                  <button className={styles.primaryButton} onClick={handleSaveAccount}>
                    Save Changes
                  </button>
                </div>

                <div className={styles.divider} />

                {/* Password Section */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Password</h2>

                  <div className={styles.formField}>
                    <label className={styles.label}>Current password</label>
                    <input
                      ref={oldPasswordRef}
                      className={styles.input}
                      type="password"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>New password</label>
                    <input
                      ref={newPasswordRef}
                      className={styles.input}
                      type="password"
                      placeholder="Enter new password"
                    />
                    <p className={styles.helpText}>
                      Your password must have at least 8 characters, include one uppercase letter, one lowercase letter,
                      one number, and one special character.
                    </p>
                  </div>

                  <div className={styles.formField}>
                    <input
                      ref={confirmNewPasswordRef}
                      className={styles.input}
                      type="password"
                      placeholder="Re-type new password"
                    />
                  </div>

                  <button className={styles.primaryButton} onClick={handleChangePassword}>
                    Change password
                  </button>
                </div>

                <div className={styles.divider} />

                {/* Danger Zone */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Danger zone</h2>

                  <div className={styles.dangerAlert}>
                    <div className={styles.dangerAlertContent}>
                      <h3 className={styles.dangerAlertTitle}>Delete account</h3>
                      <p className={styles.dangerAlertDescription}>
                        Permanently remove your account. This action is not reversible.
                      </p>
                    </div>
                    <button className={styles.dangerButton} onClick={() => setShowDeleteModal(true)}>
                      Delete account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'api' && (
              <div className={styles.contentSection}>
                <div className={styles.header}>
                  <h1 className={styles.pageTitle}>API Keys</h1>
                  <p className={styles.pageSubtitle}>Manage your API keys and access tokens</p>
                </div>
                <div className={styles.comingSoon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p>API Keys coming soon</p>
                </div>
              </div>
            )}

            {selectedTab === 'notifications' && (
              <div className={styles.contentSection}>
                <div className={styles.header}>
                  <h1 className={styles.pageTitle}>Notifications</h1>
                  <p className={styles.pageSubtitle}>Configure how you receive notifications</p>
                </div>

                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Notification Preferences</h2>
                  <p className={styles.helpText} style={{ marginBottom: '24px' }}>
                    Choose how you want to be notified for different events
                  </p>

                  <div className={styles.notificationTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Notification Type</th>
                          <th>Push</th>
                          <th>Email</th>
                          <th>Web</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries({
                          scan_complete: 'TuneScan complete',
                          new_match: 'New match detected',
                          unauthorized_use: 'Unauthorized use detected',
                          statement_processed: 'Revenue statement processed',
                          revenue_discrepancy: 'Revenue discrepancy found',
                          revenue_spike: 'Revenue spike detected',
                          revenue_leak: 'Revenue leak detected',
                          milestone: 'Streaming milestone reached',
                          trending: 'Song trending',
                          catalog_update: 'Catalog updated/synced',
                          agreement_parsed: 'Agreement analyzed',
                          critical_red_flag: 'Critical agreement issue',
                          termination_expiring: 'Termination window closing',
                          weekly_report: 'Weekly summary report',
                        }).map(([key, label]) => (
                          <tr key={key}>
                            <td className={styles.notificationLabel}>{label}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={notificationPrefs[key]?.push || false}
                                onChange={(e) =>
                                  setNotificationPrefs((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], push: e.target.checked },
                                  }))
                                }
                                className={styles.checkbox}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={notificationPrefs[key]?.email || false}
                                onChange={(e) =>
                                  setNotificationPrefs((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], email: e.target.checked },
                                  }))
                                }
                                className={styles.checkbox}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={notificationPrefs[key]?.web || false}
                                onChange={(e) =>
                                  setNotificationPrefs((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], web: e.target.checked },
                                  }))
                                }
                                className={styles.checkbox}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button className={styles.primaryButton} style={{ marginTop: '24px' }}>
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Delete Account</h2>
              <p className={styles.modalDescription}>
                This action cannot be undone. Everything including the results of the scans will be wiped. Continue?
              </p>
              <div className={styles.modalActions}>
                <button className={styles.secondaryButton} onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button className={styles.dangerButton} onClick={handleDeleteAccount}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Settings;
