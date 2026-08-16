import { FaCaretDown } from 'react-icons/fa';
import styles from './accordion.css';

const Accordion = ({ isExpanded = false, onClick = () => {}, title, children }) => {
  return (
    <>
      <div className="accordion-head" onClick={onClick}>
        <div className="head-content">
          <div>{title}</div>
          <FaCaretDown className={`accordion-caret ${isExpanded ? 'caret-expanded' : ''}`} />
        </div>
      </div>
      <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>{children}</div>
    </>
  );
};
export default Accordion;
