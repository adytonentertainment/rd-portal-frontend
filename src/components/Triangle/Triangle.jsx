import React from 'react';

const Triangle = ({ color = 'white', scale = 1, rotation = 0, className = {} }) => {
  return (
    <div
      style={{
        ...{
          borderColor: `transparent transparent ${color} transparent`,
          borderStyle: 'solid',
          borderWidth: `0px ${75 * scale}px ${100 * scale}px ${75 * scale}px`,
          height: '0px',
          width: '0px',
          transform: `rotate(${rotation}deg)`,
          display: 'inline-block',
        },
        ...className,
      }}
    ></div>
  );
};

export default Triangle;
