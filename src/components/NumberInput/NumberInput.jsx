import { useState, forwardRef } from 'react';

const NumberInput = forwardRef(
  ({ reference, initialValue, min = Number.MIN_VALUE, max = Number.MAX_VALUE, className = '' }, ref) => {
    const [value, setValue] = useState(initialValue);
    const handleOnInput = async (e) => {
      const num = e.target.value;
      if (!num) {
        setValue(undefined);
        return;
      }
      let numberParsed = Number(num);

      if (numberParsed > max) numberParsed = max;
      if (numberParsed < min) numberParsed = min;

      setValue(numberParsed);
    };

    return (
      <>
        <input ref={reference} type="number" onInput={(e) => handleOnInput(e)} value={value} className={className} />
      </>
    );
  }
);
export default NumberInput;
