import styles from './genius-button.css';
import { SiGenius } from 'react-icons/si';

const GeniusButton = ({ children, className = '', onClick = (event) => {} }) => {
  return (
    <div className={`genius-button ${className}`} onClick={onClick}>
      <SiGenius size="25" />
      <div>{children}</div>
    </div>
  );
};
export default GeniusButton;
