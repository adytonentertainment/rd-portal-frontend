import styles from './messagebox.module.css';

const MessageBox = ({ children, className }) => {
  return children ? <div className={styles.messagebox + ' ' + className}>{children}</div> : <></>;
};
export default MessageBox;
