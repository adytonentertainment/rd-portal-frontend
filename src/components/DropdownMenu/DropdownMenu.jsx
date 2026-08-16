import { useState, useEffect, useRef } from 'react';
import FlatButton from '../Buttons/FlatButton/FlatButton';
import { FaCaretDown } from 'react-icons/fa';
import styles from './dropdownmenu.module.css';
import RoundedSection from '../RoundedSection/RoundedSection';

const DropdownMenu = ({
  content,
  className = '',
  direction = 'bottom',
  directionAmount = 40,
  onSelect = () => {},
  header = '',
}) => {
  // direction: up, bottom, left, right
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(header || content[0]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    console.log('[DropdownMenu] header changed to:', header, 'current selectedItem:', selectedItem);
    if (header && header !== selectedItem) {
      console.log('[DropdownMenu] Updating selectedItem from', selectedItem, 'to', header);
      setSelectedItem(header);
    }
  }, [header]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const coordinate = direction === 'bottom' || direction === 'up' ? 'Y' : 'X';
  const sign = direction === 'bottom' || direction === 'right' ? '' : '-';

  const transformDirection = `translate${coordinate}(${sign}${isOpen * directionAmount}px)`;

  const maxLength = [...content].sort((a, b) => b.length - a.length)[0].length;

  return (
    <div ref={dropdownRef} className={`${styles.dropdownMenuElement} ${className} w-[${maxLength}rem]`}>
      <FaCaretDown className={`${styles.dropdownMenuCaret} ${isOpen ? styles.dropdownMenuCaretRotate : ''}`} />

      <div className={styles.dropdownMenuClick} onClick={() => setIsOpen(!isOpen)}>
        {selectedItem}
      </div>
      <div
        className={styles.dropdownMenuContent}
        style={{
          opacity: isOpen ? 1 : 0,
          transform: transformDirection,
          pointerEvents: isOpen ? 'all' : 'none',
          zIndex: isOpen ? 1 : 1,
        }}
      >
        {content.map((value, index) => {
          return (
            <div
              className="cursor-pointer"
              key={index}
              onClick={() => {
                setIsOpen(false);
                setSelectedItem(value);
                onSelect(value);
              }}
            >
              {value}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DropdownMenu;
