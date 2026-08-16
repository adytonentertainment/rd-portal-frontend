import { useEffect } from 'react';

// Calculate font size based on formatted value length to fit in card
// Uses ratio-based scaling that works for any base size
const getResponsiveFontSize = (formattedValue, baseSize = 24) => {
  const length = String(formattedValue).length;
  // Scale down by ~15% for each threshold exceeded
  if (length <= 7) return baseSize;
  if (length <= 9) return Math.round(baseSize * 0.85);
  if (length <= 11) return Math.round(baseSize * 0.7);
  if (length <= 13) return Math.round(baseSize * 0.6);
  return Math.round(baseSize * 0.5);
};

const RevenueDisplay = ({ value, onCountComplete }) => {
  // Call onCountComplete immediately since we're not animating
  useEffect(() => {
    if (onCountComplete) {
      onCountComplete();
    }
  }, [value, onCountComplete]);

  // Format number with commas
  const formattedValue = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const fontSize = getResponsiveFontSize(formattedValue);

  return (
    <div
      style={{
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: 'var(--text)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}
    >
      ${formattedValue}
    </div>
  );
};

export default RevenueDisplay;
