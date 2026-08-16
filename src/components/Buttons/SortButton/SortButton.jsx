import { useState } from 'react';
import styles from './sortbutton.module.css';
import { TiArrowSortedDown } from 'react-icons/ti';
import { TiArrowSortedUp } from 'react-icons/ti';

const SortButton = ({ children, onSort = (order) => {}, className = '' }) => {
  const [currentOrder, setCurrentOrder] = useState('nothing');

  const handleChangeOrder = () => {
    let newOrder;
    if (currentOrder === 'nothing') newOrder = 'ascending';
    else if (currentOrder === 'ascending') newOrder = 'descending';
    else newOrder = 'nothing';
    setCurrentOrder(newOrder);
    onSort(newOrder);
  };

  return (
    <div className={styles.sortButton + ' ' + className} onClick={handleChangeOrder}>
      <div>
        <TiArrowSortedUp
          className={
            styles.sortButtonArrow + ' ' + (currentOrder === 'ascending' ? styles.sortButtonArrowSelected : '')
          }
        />
        <TiArrowSortedDown
          className={
            styles.sortButtonArrow + ' ' + (currentOrder === 'descending' ? styles.sortButtonArrowSelected : '')
          }
        />
      </div>
      {children}
    </div>
  );
};
export default SortButton;
