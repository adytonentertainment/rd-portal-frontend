import { useState, useEffect, useRef } from 'react';
import styles from './dropdown.css';

const Dropdown = ({
  children,
  clicker,
  className = '',
  contentClassName = '',
  direction = 'bottom',
  directionAmount = 40,
}) => {
  // direction: up, bottom, left, right
  const [click, setClick] = useState(false);
  const dropdownRef = useRef(null);

  const coordinate = direction === 'bottom' || direction === 'up' ? 'Y' : 'X';
  const sign = direction === 'bottom' || direction === 'right' ? '' : '-';

  const transformDirection = `translate${coordinate}(${sign}${click * directionAmount}px)`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setClick(false);
      }
    };

    if (click) {
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [click]);

  return (
    <div className={`dropdown-element ${className}`} ref={dropdownRef}>
      <div className="dropdown-click" onClick={() => setClick(!click)}>
        {clicker}
      </div>
      <div
        className={`dropdown-content ${contentClassName}`}
        style={{
          opacity: click ? 1 : 0,
          transform: transformDirection,
          pointerEvents: click ? 'all' : 'none',
          zIndex: click ? 999 : 999,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Dropdown;
