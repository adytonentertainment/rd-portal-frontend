import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import NavBar from '../../components/NavBar/NavBar';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import styles from './subscriptionactivated.module.css';

const SubscriptionActivated = () => {
  const navigate = useNavigate();
  const { currentTheme } = useContext(ThemeContext);

  return (
    <>
      <NavBar />
      <div className={styles.container} data-theme={currentTheme}>
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className={styles.title}>Subscription Activated!</h1>

          <p className={styles.message}>
            Your subscription is now active. You can now start adding tracks and managing your catalog.
          </p>

          <p className={styles.note}>
            Please note that it can take up to a minute for your subscription to be fully activated.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <FlatButton onClick={() => navigate('/catalog')}>Go to Catalog</FlatButton>
          </div>
        </div>
      </div>
    </>
  );
};
export default SubscriptionActivated;
