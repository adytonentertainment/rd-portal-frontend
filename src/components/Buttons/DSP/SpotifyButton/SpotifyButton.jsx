import styles from './spotify-button.css';
import { FaSpotify } from 'react-icons/fa';

const SpotifyButton = ({ children, className = '', onClick = (event) => {} }) => {
  return (
    <div className={`spotify-button ${className}`} onClick={onClick}>
      <FaSpotify />
      <div>{children}</div>
    </div>
  );
};
export default SpotifyButton;
