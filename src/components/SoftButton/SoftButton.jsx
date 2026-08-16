import React from 'react';
import { Link } from 'react-router-dom';
import styles from './softButton.css';

const SoftButton = ({ text, route, className = '' }) => {
  return (
    <button type="button" className={`custom-button ${className}`} onClick={() => (window.location.href = route)}>
      {text}
    </button>
  );
};

export default SoftButton;
