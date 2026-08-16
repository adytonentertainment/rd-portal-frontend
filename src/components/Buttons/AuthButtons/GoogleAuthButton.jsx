import { useGoogleLogin } from '@react-oauth/google';
import { FaGoogle, FaApple, FaFacebook } from 'react-icons/fa';
import styles from './authbutton.css';
import urlJoin from 'url-join';

const GoogleAuthButton = ({ className = '' }) => {
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      login_google(tokenResponse.access_token);
    },
  });

  // login with google auth token
  const login_google = async (token) => {
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
    }
  };

  return (
    <div className={`auth-button ${className}`} onClick={handleGoogleLogin}>
      <FaGoogle className="auth-logo" />
    </div>
  );
};
export default GoogleAuthButton;
