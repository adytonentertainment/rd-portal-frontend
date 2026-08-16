import styles from './redbutton.css';

const RedButton = ({ onClick, className = '', children = '' }) => {
  return (
    <>
      <div onClick={onClick} className={`button-red ${className}`}>
        {children}
      </div>
    </>
  );
};

export default RedButton;
