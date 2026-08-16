import { useState } from 'react';
import styles from './expander.css';

const Expander = ({
  header,
  body,
  className,
  file_id = '',
  disabled = false,
  onClick = () => {},
  expanded = false,
}) => {
  return (
    <div className={`expander-main ${className}`} key={file_id}>
      <div
        className="expander-header"
        onClick={() => {
          if (!disabled) {
            onClick();
          }
        }}
      >
        {header}
      </div>
      <div className={`to-expand ${expanded ? 'expanded' : ''}`}>{body}</div>
    </div>
  );
};

export default Expander;
