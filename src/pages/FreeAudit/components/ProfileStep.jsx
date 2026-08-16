import { useState } from 'react';
import './Steps.css';

function ProfileStep({ userType, value, onChange, onNext, onBack }) {
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [normalizedUrl, setNormalizedUrl] = useState('');

  const normalizeInput = (input) => {
    const trimmed = input.trim();
    if (userType === 'songwriter') {
      if (!trimmed.includes('/') && !trimmed.includes('.')) {
        return `https://genius.com/artists/${trimmed}`;
      }
    }
    return trimmed;
  };

  const handleNext = () => {
    if (!value.trim()) {
      setError('Please enter your profile URL or username');
      return;
    }
    setError('');
    const resolved = normalizeInput(value);
    setNormalizedUrl(resolved);
    setConfirming(true);
  };

  const handleConfirm = () => {
    onChange(normalizedUrl);
    onNext();
  };

  const handleEdit = () => {
    setConfirming(false);
  };

  const placeholder =
    userType === 'songwriter' ? 'genius.com/artists/... or just your username' : 'https://open.spotify.com/artist/...';

  const label = userType === 'songwriter' ? 'Your Genius Profile URL or Username' : 'Your Spotify Profile URL';

  if (confirming) {
    return (
      <div className="step-content">
        <div
          style={{
            background: 'var(--input-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            wordBreak: 'break-all',
            textAlign: 'center',
          }}
        >
          {normalizedUrl}
        </div>
        <div className="button-group" style={{ marginTop: '16px' }}>
          <button className="btn-secondary" onClick={handleEdit}>
            Edit
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            Yes, continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content">
      <div className="input-group">
        <label htmlFor="profile-url">{label}</label>
        <input
          id="profile-url"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={error ? 'error' : ''}
        />
        {error && <span className="error-text">{error}</span>}
      </div>

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

export default ProfileStep;
