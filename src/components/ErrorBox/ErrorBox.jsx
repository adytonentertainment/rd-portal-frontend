import styles from './errorbox.module.css';

const ErrorBox = ({ children, className }) => {
  return children ? <div className={styles.errorbox + ' ' + className}>{children}</div> : <></>;
};
export default ErrorBox;
