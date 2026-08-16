import { useState, useEffect, useRef } from 'react';
import FlatButton from '../Buttons/FlatButton/FlatButton';
import { FaCaretDown } from 'react-icons/fa';
import styles from './dropdown-multiselection.module.css';
import { Checkbox } from '@mui/material';

const DropdownMultiSelection = ({
  header,
  content,
  className = '',
  direction = 'bottom',
  directionAmount = 40,
  disabled = false,
  onSelect = () => {},
  defaultSelected = [],
  selected = null, // Add controlled mode support
}) => {
  // direction: up, bottom, left, right
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(defaultSelected);
  const dropdownRef = useRef(null);

  // Update internal state when defaultSelected changes (for uncontrolled mode)
  useEffect(() => {
    if (selected === null) {
      setSelectedItems(defaultSelected);
    }
  }, [defaultSelected, selected]);

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

  const handleSelectionChange = async (item, checked) => {
    // Use controlled prop if provided, otherwise use internal state
    const currentItems = selected !== null ? selected : selectedItems;
    let newSelectedItems = [...currentItems];

    // Handle "Select All" option
    if (item === 'Select All') {
      if (checked) {
        newSelectedItems = [...content];
      } else {
        newSelectedItems = [];
      }
    } else {
      if (checked) newSelectedItems.push(item);
      else {
        const index = newSelectedItems.indexOf(item);
        if (index > -1) newSelectedItems.splice(index, 1);
      }
    }

    // Only update internal state if not in controlled mode
    if (selected === null) {
      setSelectedItems(newSelectedItems);
    }
    onSelect(newSelectedItems);
  };

  // Use controlled prop if provided, otherwise use internal state for display
  const currentItems = selected !== null ? selected : selectedItems;
  const selectedCount = currentItems.length;
  const allSelected = selectedCount === content.length;

  return (
    <div ref={dropdownRef} className={`${styles.dropdownMenuElement} ${className}`} style={{ minWidth: '120px' }}>
      <div
        className="flex flex-row items-center gap-2 cursor-pointer w-full"
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
      >
        <FaCaretDown className={`${styles.dropdownMenuCaret} ${isOpen ? styles.dropdownMenuCaretRotate : ''}`} />
        <div className={styles.dropdownMenuClick}>
          {header}
          {selectedCount > 0 && !allSelected && (
            <span
              style={{
                position: 'absolute',
                right: '-20px',
                top: '-15px',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'var(--secondary)',
                color: 'var(--secondary-text)',
                fontWeight: '600',
                minWidth: '16px',
                display: 'inline-block',
                textAlign: 'center',
              }}
            >
              {selectedCount}
            </span>
          )}
        </div>
      </div>
      <div
        className={styles.dropdownMenuContent}
        style={{
          opacity: isOpen ? 1 : 0,
          transform: transformDirection,
          pointerEvents: isOpen ? 'all' : 'none',
          zIndex: isOpen ? 9999 : 1,
        }}
      >
        {/* Select All option at the top */}
        <div
          className="flex flex-nowrap flex-row items-center justify-between"
          style={{
            borderBottom: '1px solid var(--panel-border)',
            paddingBottom: '8px',
            marginBottom: '8px',
            padding: '6px 8px',
            borderRadius: '4px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '11px' }}>Select All</div>
          <Checkbox
            size="small"
            checked={(selected !== null ? selected : selectedItems).length === content.length && content.length > 0}
            onChange={(e) => handleSelectionChange('Select All', e.target.checked)}
            sx={{
              padding: '4px',
              '& .MuiSvgIcon-root': { fontSize: 18 },
            }}
          />
        </div>

        {content.map((item, index) => {
          // Use controlled prop if provided, otherwise use internal state
          const currentItems = selected !== null ? selected : selectedItems;
          return (
            <div
              className="flex flex-nowrap flex-row items-center justify-between"
              key={index}
              style={{ fontSize: '11px' }}
            >
              <div>{item}</div>
              <Checkbox
                size="small"
                checked={currentItems.includes(item)}
                onChange={(e) => handleSelectionChange(item, e.target.checked)}
                sx={{
                  padding: '4px',
                  '& .MuiSvgIcon-root': { fontSize: 18 },
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DropdownMultiSelection;
