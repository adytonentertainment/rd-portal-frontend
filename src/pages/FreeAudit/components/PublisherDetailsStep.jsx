import { useState } from 'react';
import './Steps.css';

function PublisherDetailsStep({ ipNumber, publisherName, onIpChange, onNameChange, onNext, onBack }) {
  const [errors, setErrors] = useState({});

  const handleNext = () => {
    const newErrors = {};

    if (!publisherName.trim()) {
      newErrors.name = 'Please enter your publisher name';
    }

    if (!ipNumber.trim()) {
      newErrors.ip = "Please enter your publisher's IPI number";
    } else if (!/^\d{9,11}$/.test(ipNumber.trim())) {
      newErrors.ip = 'IPI number should be 9-11 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onNext();
  };

  return (
    <div className="step-content">
      <p className="helper-text">We need your publisher's information to check for proper registration and metadata.</p>

      <div className="input-group">
        <label htmlFor="publisher-name">Publisher Name</label>
        <input
          id="publisher-name"
          type="text"
          value={publisherName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Sony Music Publishing"
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="input-group">
        <label htmlFor="publisher-ipi">Publisher's IPI Number</label>
        <input
          id="publisher-ipi"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={ipNumber}
          onChange={(e) => onIpChange(e.target.value)}
          placeholder="e.g. 00123456789"
          className={errors.ip ? 'error' : ''}
          maxLength="11"
        />
        {errors.ip && <span className="error-text">{errors.ip}</span>}
      </div>

      <div className="button-group">
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button className="btn-primary" onClick={handleNext}>
          Get My Audit
        </button>
      </div>
    </div>
  );
}

export default PublisherDetailsStep;
