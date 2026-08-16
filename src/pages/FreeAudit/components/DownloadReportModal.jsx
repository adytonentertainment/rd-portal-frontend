import { useState } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const FORMSPREE_URL = 'https://formspree.io/f/mqedvlwv';

function DownloadReportModal({ onClose, results, artistName, formData }) {
  const [email, setEmail] = useState(formData?.email || '');
  const [status, setStatus] = useState('idle'); // idle, sending, sent, error
  const [errorMsg, setErrorMsg] = useState('');

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    const songs = (results?.songs || []).map((s) => ({
      title: s.title || '',
      artist: s.artist || '',
      isrc: s.isrc || null,
      registered: !!s.registered,
      issues: s.issues || [],
    }));

    const summary = {
      total: results?.totalSongs || results?.songs?.length || 0,
      registered: results?.songs?.filter((s) => s.registered).length || 0,
      unregistered: results?.songs?.filter((s) => !s.registered).length || 0,
      issueCount: results?.songs?.filter((s) => s.issues?.length > 0).length || 0,
    };

    // Build writer name from formData
    const writerName = [formData?.writerFirstName, formData?.writerMiddleName, formData?.writerLastName]
      .filter(Boolean)
      .join(' ');

    // Always capture email to Formspree first (fire-and-forget)
    fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        artistName: artistName || '',
        writerName: writerName || '',
        ipiNumber: formData?.ipNumber || '',
        userType: formData?.userType || '',
        hasPRO: formData?.hasPRO || '',
        hasPublisher: formData?.hasPublisher || '',
        publisherName: formData?.publisherName || '',
        publisherIPI: formData?.publisherIpNumber || '',
        profileUrl: formData?.profileUrl || '',
        totalSongs: summary.total,
        registered: summary.registered,
        unregistered: summary.unregistered,
        issuesFound: summary.issueCount,
        _subject: `Free Audit Lead - ${artistName || 'Unknown Artist'}`,
        songs: songs
          .map((s) => `${s.title} - ${s.artist} [${s.registered ? 'Registered' : 'Unregistered'}]`)
          .join('\n'),
      }),
    }).catch(() => {});

    try {
      // Send report email via backend
      const res = await fetch(`${API_URL}/free-audit/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          artistName: artistName || 'Unknown Artist',
          songs,
          summary,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to send report');
      }

      setStatus('sent');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <button className="report-modal-close" onClick={onClose}>
          &times;
        </button>

        {status === 'sent' ? (
          <div className="report-modal-success">
            <div className="report-modal-check">&#10003;</div>
            <h3>Report sent!</h3>
            <p>
              Check your inbox at <b>{email}</b> for your catalog audit report.
            </p>
            <button className="btn-cta" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <h3>Get your audit report</h3>
            <p>Enter your email and we'll send you a detailed PDF report of your catalog audit results.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                className="report-modal-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'sending'}
                autoFocus
              />
              {errorMsg && <p className="report-modal-error">{errorMsg}</p>}
              <button className="btn-cta" type="submit" disabled={status === 'sending' || !email}>
                {status === 'sending' ? 'Sending...' : 'Send Report'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default DownloadReportModal;
