import { useState } from 'react';
import './Steps.css';

function PROStep({ value, onChange, onNext, onBack }) {
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!value) {
      setError('Please select an option');
      return;
    }
    setError('');
    onNext();
  };

  return (
    <div className="step-content">
      <p className="helper-text">
        PROs (Performance Rights Organizations) like ASCAP, BMI, or SESAC collect royalties for public performances of
        your music.
      </p>

      <div className="options-grid">
        <button className={`option-card ${value === 'yes' ? 'selected' : ''}`} onClick={() => onChange('yes')}>
          <div className="option-icon">✓</div>
          <h3>Yes</h3>
          <p>I'm registered with a PRO</p>
        </button>

        <button className={`option-card ${value === 'no' ? 'selected' : ''}`} onClick={() => onChange('no')}>
          <div className="option-icon">✗</div>
          <h3>No</h3>
          <p>I'm not registered yet</p>
        </button>
      </div>

      {error && <span className="error-text centered">{error}</span>}

      <div className="button-group">
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button className="btn-primary" onClick={handleNext}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default PROStep;
