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
  const { selectedClient } = useClientContext();

  const [selectedTab, setSelectedTab] = useState('account');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  const oldPasswordRef = useRef();
  const newPasswordRef = useRef();
  const confirmNewPasswordRef = useRef();
  const firstNameRef = useRef();
  const lastNameRef = useRef();
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
        },
      });

      if (response.status === 200) {
        setUserInfo(response.data);
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
      <NavBar marketingLinks={false} showDashboard={false} />
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
