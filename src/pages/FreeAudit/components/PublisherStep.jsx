import { useState } from 'react';
import './Steps.css';

function PublisherStep({ value, onChange, onNext, onBack }) {
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
        A music publisher helps manage your copyrights and collects royalties on your behalf.
      </p>

      <div className="options-grid three-column">
        <button className={`option-card ${value === 'yes' ? 'selected' : ''}`} onClick={() => onChange('yes')}>
          <div className="option-icon">✓</div>
          <h3>Yes</h3>
          <p>I have a publisher</p>
        </button>

        <button className={`option-card ${value === 'no' ? 'selected' : ''}`} onClick={() => onChange('no')}>
          <div className="option-icon">✗</div>
          <h3>No</h3>
          <p>I don't have one</p>
        </button>

        <button
          className={`option-card ${value === 'dont_know' ? 'selected' : ''}`}
          onClick={() => onChange('dont_know')}
        >
          <div className="option-icon">?</div>
          <h3>Not Sure</h3>
          <p>I don't know</p>
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

export default PublisherStep;
