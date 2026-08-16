import { useState } from 'react';
import './Steps.css';

function IPNumberStep({
  value,
  onChange,
  onNext,
  onBack,
  label = 'Your IPI Number',
  writerFirstName = '',
  writerMiddleName = '',
  writerLastName = '',
  onFirstNameChange,
  onMiddleNameChange,
  onLastNameChange,
}) {
  const [error, setError] = useState('');
  const [mode, setMode] = useState('ipi'); // 'ipi' or 'name'

  const handleNext = () => {
    if (mode === 'ipi') {
      if (!value.trim()) {
        setError('Please enter your IPI number');
        return;
      }
      if (!/^\d{9,11}$/.test(value.trim())) {
        setError('IPI number should be 9-11 digits');
        return;
      }
    } else {
      if (!writerFirstName.trim() || !writerLastName.trim()) {
        setError('Please enter at least your first and last name.');
        return;
      }
    }
    setError('');
    onNext();
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="step-content">
      <div className="mode-toggle">
        <button
          className={`mode-toggle-btn ${mode === 'ipi' ? 'active' : ''}`}
          onClick={() => switchMode('ipi')}
          type="button"
        >
          IPI Number
        </button>
        <button
          className={`mode-toggle-btn ${mode === 'name' ? 'active' : ''}`}
          onClick={() => switchMode('name')}
          type="button"
        >
          Legal Name
        </button>
      </div>

      {mode === 'ipi' ? (
        <>
          <p className="helper-text">
            Your IPI (Interested Party Information) number is a unique identifier assigned to songwriters and
            publishers. It's typically 9-11 digits. Using your IPI provides the most accurate results.
          </p>
          <div className="input-group">
            <label htmlFor="ipi-number">{label}</label>
            <input
              id="ipi-number"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. 00123456789"
              className={error ? 'error' : ''}
              maxLength="11"
            />
            {error && <span className="error-text">{error}</span>}
          </div>
        </>
      ) : (
        <>
          <p className="helper-text">
            Enter your legal name as it appears on your publishing registrations. For more accurate results, we
            recommend using your IPI number instead.
          </p>
          <div className="input-group">
            <label htmlFor="writer-first-name">First Name</label>
            <input
              id="writer-first-name"
              type="text"
              value={writerFirstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              placeholder="John"
              className={error && !writerFirstName.trim() ? 'error' : ''}
            />
          </div>
          <div className="input-group">
            <label htmlFor="writer-middle-name">Middle Name (optional)</label>
            <input
              id="writer-middle-name"
              type="text"
              value={writerMiddleName}
              onChange={(e) => onMiddleNameChange(e.target.value)}
              placeholder="Michael"
            />
          </div>
          <div className="input-group">
            <label htmlFor="writer-last-name">Last Name</label>
            <input
              id="writer-last-name"
              type="text"
              value={writerLastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              placeholder="Smith"
              className={error && !writerLastName.trim() ? 'error' : ''}
            />
          </div>
          {error && <span className="error-text centered">{error}</span>}
        </>
      )}

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

export default IPNumberStep;
