import React from 'react';
import styles from './roundedsection.module.css';

const RoundedSection = ({ onlyBorder = true, id, children, className }) => {
  return (
    <div id={id} className={`${styles.roundedSection} ${className} ${onlyBorder ? '' : styles.filled}`}>
      {children}
    </div>
  );
};

export default RoundedSection;
