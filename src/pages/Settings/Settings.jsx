import { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';
import axios from 'axios';
import NavBar from '../../components/NavBar/NavBar';
import { UserContextProvider } from '../../components/UserContext/UserContext';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { useClientContext } from '../../components/ClientContext/ClientContext';
import styles from './settings.module.css';
import { Helmet } from 'react-helmet-async';
import { validatePassword } from '../../utils/passwordValidator';
import { useLanguage } from '../../i18n/LanguageContext';

const Settings = () => {
  const navigate = useNavigate();
  const user = useContext(UserContextProvider);
  const { currentTheme } = useContext(ThemeContext);
  const { selectedClient } = useClientContext();
  const { t } = useLanguage();

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
      try {
        const response = await axios({
          method: 'GET',
          url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
          headers: { accept: 'application/json' },
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
        // Not signed in (or the session ended): back to the start.
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/');
        }
      }
    };

    fetchUserInfo();
  }, [navigate, selectedClient]);

  const handleDeleteAccount = async () => {
    try {
      // The API also clears the session cookie on success.
      const response = await axios({
        method: 'DELETE',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
        headers: { accept: 'application/json' },
      });
      if (response.status === 204) {
        // Clear all authentication data
        localStorage.clear();
        sessionStorage.clear();

        // Use replace to prevent back navigation
        // Relative: this is our own login route. Building it from
        // REACT_APP_FRONTEND_URL redirected onto whatever host that variable
        // happened to hold — staging.verax.app in a production build.
        window.location.replace('/login');
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
      alert(t('settings.passwordsMismatch'));
      return;
    }

    // Validate password strength
    const validation = validatePassword(newPasswordRef.current.value, t);
    if (!validation.isValid) {
      alert(t('settings.passwordWeak') + '\n' + validation.errors.join('\n'));
      return;
    }

    try {
      const response = await axios({
        method: 'POST',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/change-password'),
        headers: { accept: 'application/json' },
        data: {
          password_old: oldPasswordRef.current.value,
          password_new: newPasswordRef.current.value,
        },
      });
      if (response.status === 200) {
        alert(t('settings.passwordChanged'));
        oldPasswordRef.current.value = '';
        newPasswordRef.current.value = '';
        confirmNewPasswordRef.current.value = '';
      }
    } catch (error) {
      console.error('Error changing password:', error);
      // Show backend validation errors if available
      const errorDetail = error.response?.data?.detail;
      if (errorDetail) {
        alert(t('settings.passwordFailed') + ': ' + errorDetail);
      } else {
        alert(t('settings.passwordFailed'));
      }
    }
  };

  const handleSaveAccount = async () => {
    try {
      // Save user account fields (first name, last name)
      const response = await axios({
        method: 'PATCH',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user'),
        headers: {
          accept: 'application/json',
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
        alert(t('settings.saved'));
      }
    } catch (error) {
      console.error('Error saving account information:', error);
      alert(t('settings.saveFailed'));
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
      alert(t('settings.imageOnly'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('settings.imageTooBig'));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios({
        method: 'POST',
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, 'auth/user/avatar'),
        data: formData,
      });

      if (response.status === 200) {
        setAvatarUrl(urlJoin(process.env.REACT_APP_BACKEND_URL, response.data.avatar_url));
        alert(t('settings.avatarUploaded'));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(t('settings.avatarFailed'));
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
            <h2 className={styles.settingsTitle}>{t('settings.title')}</h2>

            <div className={styles.menuSection}>
              <h3 className={styles.menuSectionTitle}>{t('settings.personal')}</h3>
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
                {t('settings.account')}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {selectedTab === 'account' && (
              <div className={styles.contentSection}>
                <div className={styles.header}>
                  <h1 className={styles.pageTitle}>{t('settings.account')}</h1>
                  <p className={styles.pageSubtitle}>{t('settings.accountSubtitle')}</p>
                </div>

                {/* Profile Section */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('settings.profile')}</h2>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t('settings.avatar')}</label>
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
                          {t('settings.upload')}
                        </button>
                        <p className={styles.helpText}>{t('settings.avatarHelp')}</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label className={styles.label}>{t('settings.firstName')}</label>
                      <input
                        ref={firstNameRef}
                        className={styles.input}
                        type="text"
                        placeholder={t('settings.firstName')}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.label}>{t('settings.lastName')}</label>
                      <input
                        ref={lastNameRef}
                        className={styles.input}
                        type="text"
                        placeholder={t('settings.lastName')}
                      />
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>{t('settings.email')}</label>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder={user?.email || 'email@example.com'}
                      disabled
                    />
                  </div>

                  <button className={styles.primaryButton} onClick={handleSaveAccount}>
                    {t('settings.save')}
                  </button>
                </div>

                <div className={styles.divider} />

                {/* Password Section */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('settings.password')}</h2>

                  <div className={styles.formField}>
                    <label className={styles.label}>{t('settings.currentPassword')}</label>
                    <input
                      ref={oldPasswordRef}
                      className={styles.input}
                      type="password"
                      placeholder={t('settings.currentPasswordPh')}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>{t('settings.newPassword')}</label>
                    <input
                      ref={newPasswordRef}
                      className={styles.input}
                      type="password"
                      placeholder={t('settings.newPasswordPh')}
                    />
                    <p className={styles.helpText}>{t('settings.passwordRules')}</p>
                  </div>

                  <div className={styles.formField}>
                    <input
                      ref={confirmNewPasswordRef}
                      className={styles.input}
                      type="password"
                      placeholder={t('settings.confirmPasswordPh')}
                    />
                  </div>

                  <button className={styles.primaryButton} onClick={handleChangePassword}>
                    {t('settings.changePassword')}
                  </button>
                </div>

                <div className={styles.divider} />

                {/* Danger Zone */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t('settings.dangerZone')}</h2>

                  <div className={styles.dangerAlert}>
                    <div className={styles.dangerAlertContent}>
                      <h3 className={styles.dangerAlertTitle}>{t('settings.deleteAccount')}</h3>
                      <p className={styles.dangerAlertDescription}>{t('settings.deleteAccountHint')}</p>
                    </div>
                    <button className={styles.dangerButton} onClick={() => setShowDeleteModal(true)}>
                      {t('settings.deleteAccount')}
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
              <h2 className={styles.modalTitle}>{t('settings.deleteAccount')}</h2>
              <p className={styles.modalDescription}>{t('settings.deleteConfirm')}</p>
              <div className={styles.modalActions}>
                <button className={styles.secondaryButton} onClick={() => setShowDeleteModal(false)}>
                  {t('settings.cancel')}
                </button>
                <button className={styles.dangerButton} onClick={handleDeleteAccount}>
                  {t('settings.deleteAccount')}
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
