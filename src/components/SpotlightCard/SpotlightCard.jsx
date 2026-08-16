import { useRef } from 'react';
import './SpotlightCard.css';

const SpotlightCard = ({
  children,
  icon: Icon,
  title,
  description,
  hasButton = true,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.25)',
}) => {
  const divRef = useRef(null);

  const handleMouseMove = (e) => {
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    divRef.current.style.setProperty('--mouse-x', `${x}px`);
    divRef.current.style.setProperty('--mouse-y', `${y}px`);
    divRef.current.style.setProperty('--spotlight-color', spotlightColor);
  };

  return (
    <div ref={divRef} onMouseMove={handleMouseMove} className={`card-spotlight ${className}`}>
      {children || (
        <>
          <div className="service-header">
            {Icon && <Icon size={32} style={{ color: 'var(--secondary)', flexShrink: 0 }} />}
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h3>
          </div>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--soft-text)',
              marginTop: '16px',
              marginBottom: hasButton ? '20px' : '0',
            }}
          >
            {description}
          </p>
        </>
      )}
    </div>
  );
};

export default SpotlightCard;
