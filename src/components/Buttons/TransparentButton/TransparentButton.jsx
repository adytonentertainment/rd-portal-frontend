import { useContext } from 'react';
import { ThemeContext } from '../../ThemeProvider/ThemeProvider';
import styles from './transparentbutton.module.css';

const TransparentButton = ({ onClick, children, className = '', applyColorBeforeHover = false }) => {
  const { currentTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={onClick}
      className={`${styles.transparentButton} ${className} ${applyColorBeforeHover ? styles.applyColor : ''}`}
      data-theme={currentTheme}
      type="button"
    >
      {children}
    </button>
  );
};

export default TransparentButton;
