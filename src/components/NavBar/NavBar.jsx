import { useRef, useState, useContext } from 'react';
// import { useGoogleLogin } from '@react-oauth/google'; // Temporarily disabled
// import { FaGoogle, FaApple, FaFacebook } from 'react-icons/fa';
// import CircularProgress from '@mui/material/CircularProgress';
import styles from './navbar.css';
import NavBarButton from '../NavBarButton/NavBarButton';
import UserControl from '../UserControl/UserControl';

import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';
import axios from 'axios';
import TransparentButton from '../Buttons/TransparentButton/TransparentButton';
import { UserContextProvider } from '../UserContext/UserContext';
// import GoogleAuthButton from '../Buttons/AuthButtons/GoogleAuthButton'; // Temporarily disabled
// import FlatButton from '../Buttons/FlatButton/FlatButton';
import VeraxLogo from '../VeraxLogo/VeraxLogo';
// import GlassButton from '../Buttons/GlassButton/GlassButton';
import ThemeButton from '../Buttons/ThemeButton/ThemeButton';

// `marketingLinks` — Pricing / About / Services point at the public Verax
// site. Signed-in product pages (Settings) have no business showing them,
// so they can be switched off there while the marketing pages keep them.
// `showDashboard` — the Dashboard button points at /catalog, a Verax product
// page. Nothing in the publisher portal wants it.
const NavBar = ({ marketingLinks = true, showDashboard = true }) => {
  // Google login temporarily disabled
  // const googleLogin = useGoogleLogin({
  //   onSuccess: async (tokenResponse) => {
  //     login_google(tokenResponse.access_token);
  //   },
  // });

  const navigate = useNavigate();
  const usernameRef = useRef();
  const passwordRef = useRef();

  const user = useContext(UserContextProvider);

  const [errorMessage, setErrorMessage] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleGoToPricing = () => {
    navigate('/pricing');
  };
  const handleGoToSection = (sectionId) => {
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  // login with username and password
  const login = async (username, password) => {
    if (loginLoading) return;
    setLoginLoading(true);
    const formDetails = new URLSearchParams();
    formDetails.append('username', username);
    formDetails.append('password', password);

    try {
      const response = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, '/auth/token'),
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: formDetails,
      });
      const data = response.data;

      if (response.status === 200) {
        localStorage.setItem('token', data.access_token);
        window.location.reload();
      } else {
        setErrorMessage(data.detail);
      }
    } catch (error) {
      setErrorMessage(error.response.data.detail);
    } finally {
      setLoginLoading(false);
    }
  };

  // login with google auth token
  const login_google = async (token) => {
    setLoginLoading(true);
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `/auth/google-login/${token}`), {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <nav>
      <div className="navbar">
        <div className="navbar-item">
          <VeraxLogo width={60} />
        </div>
        {marketingLinks && (
          <div className="navbar-item">
            <div className="navbar-links">
              <TransparentButton className="w-20" onClick={handleGoToPricing}>
                Pricing
              </TransparentButton>
              <TransparentButton className="w-20" onClick={() => handleGoToSection('problems')}>
                About
              </TransparentButton>
              <TransparentButton className="w-20" onClick={() => handleGoToSection('catalog-demo')}>
                Services
              </TransparentButton>
            </div>
          </div>
        )}
        <div className="navbar-item button-cluster">
          {/* Dashboard Button - Only when logged in */}
          {showDashboard && user && (
            <div className="cluster-element">
              <NavBarButton text="Dashboard" to="/catalog" />
            </div>
          )}

          {/* Log In Button - Only when logged out */}
          {!user && (
            <div className="cluster-element">
              <NavBarButton text="Log In" to="/login" />
            </div>
          )}

          {/* Sign Up Button - Only when logged out */}
          {!user && (
            <div className="cluster-element">
              <NavBarButton text="Sign Up" to="/signup" />
            </div>
          )}

          {/* User Control - Only when logged in */}
          {user && (
            <div className="cluster-element">
              <UserControl username={user.sub} />
            </div>
          )}

          {/* Theme Button - Always visible at the very right */}
          <div className="cluster-element">
            <ThemeButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
