import React from 'react';
import { Link } from 'react-router-dom';
import styles from './button.css';

const Button = ({ text, route, className = '' }) => {
  return (
    <button type="button" className={`custom-button ${className}`} onClick={() => (window.location.href = route)}>
      {text}
    </button>
  );
};

export default Button;
