import React from 'react';

const BoxedSection = ({ id, children, className }) => {
  return (
    <div id={id} className={`bg-inherit my-[200px] ${className}`}>
      <div className="w-max mx-auto">{children}</div>
    </div>
  );
};

export default BoxedSection;
