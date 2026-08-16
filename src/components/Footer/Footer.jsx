import { useEffect } from 'react';
import styles from './footer.css';
import urlJoin from 'url-join';
import VeraxLogo from '../VeraxLogo/VeraxLogo';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="links">
        <div className="links-column">
          <h1>Socials</h1>
          <a href="https://www.instagram.com/verax.app/">Instagram</a>
        </div>
        <div className="links-column">
          <h1>Legal</h1>
          <a href={urlJoin(process.env.REACT_APP_FRONTEND_URL, 'pp')}>Privacy Policy</a>
          <a href={urlJoin(process.env.REACT_APP_FRONTEND_URL, 'tos')}>Terms of Service</a>
          <a href={urlJoin(process.env.REACT_APP_FRONTEND_URL, 'imprint')}>Imprint</a>
        </div>
        <div className="links-column">
          <h1>Help</h1>
          <a href={urlJoin(process.env.REACT_APP_FRONTEND_URL, 'contact')}>Contact Us</a>
        </div>
      </div>
      <div className="copyright">RD © {new Date().getFullYear()}. All rights reserved.</div>
    </footer>
  );
};

export default Footer;
