import styles from './glassbutton.module.css';

const GlassButton = ({ onClick, children, className = '', stopPropagation = true }) => {
  const handleClick = (e) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div className={`${styles.glasButton} ${className}`} onClick={handleClick} role="button" tabIndex={0}>
      {children}
    </div>
  );
};
export default GlassButton;
