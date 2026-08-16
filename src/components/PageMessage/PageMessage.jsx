import NavBar from '../NavBar/NavBar';
import styles from './pagemessage.css';

const PageMessage = ({ header, children, className }) => {
  return (
    <>
      <NavBar />
      <div className="page-content">
        <h1 className="text-6xl mt-[3rem] mb-[1rem]">{header}</h1>
        <div className={`${className}`}>{children}</div>
      </div>
    </>
  );
};
export default PageMessage;
