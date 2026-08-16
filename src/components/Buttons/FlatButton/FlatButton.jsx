import styles from './flatbutton.css';

const FlatButton = ({ onClick, className = '', children = '' }) => {
  return (
    <>
      <div onClick={onClick} className={`flat-button ${className}`}>
        {children}
      </div>
    </>
  );
};

export default FlatButton;
