import { useState } from 'react';
import './Steps.css';

const FORMSPREE_URL = 'https://formspree.io/f/mqedvlwv';

function EmailGateStep({ value, onChange, onNext }) {
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(value)) return;

    setLoading(true);

    // Fire-and-forget to Formspree
    fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: value,
        _subject: 'Free Audit Started',
        source: 'free-audit-gate',
      }),
    }).catch(() => {});

    setLoading(false);
    onNext();
  };

  return (
    <div className="step-content">
      <p style={{ color: 'var(--muted-text)', fontSize: '14px', lineHeight: 1.6, textAlign: 'center' }}>
        Enter your email to get started. We'll send your audit results when they're ready.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="email"
          className="text-input"
          placeholder="your@email.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--input-bg, transparent)',
            color: 'var(--text)',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          className="btn-cta"
          disabled={!isValidEmail(value) || loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            background: isValidEmail(value) ? 'var(--accent, #111)' : 'var(--border)',
            color: isValidEmail(value) ? '#fff' : 'var(--muted-text)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: isValidEmail(value) ? 'pointer' : 'default',
            transition: 'all 150ms ease',
          }}
        >
          {loading ? 'Starting...' : 'Start Free Audit'}
        </button>
      </form>
    </div>
  );
}

export default EmailGateStep;
