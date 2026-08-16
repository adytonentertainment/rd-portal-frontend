import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { runAudit } from '../services/mlcApi';
import { fetchGeniusCatalog, fetchSpotifyCatalog } from '../services/catalogApi';
import DownloadReportModal from './DownloadReportModal';
import './Steps.css';

function ResultsStep({ formData, results, setResults }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('fetching'); // 'fetching', 'auditing', 'done', 'error'
  const [catalogCount, setCatalogCount] = useState(0);
  const [auditProgress, setAuditProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [fetchStep, setFetchStep] = useState(0);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [auditMessage, setAuditMessage] = useState(0);
  const [expandedSongs, setExpandedSongs] = useState({});
  const [showRegistered, setShowRegistered] = useState(true);
  const [showUnregistered, setShowUnregistered] = useState(true);
  const [showIssues, setShowIssues] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const isSongwriter = formData.userType === 'songwriter';

  // Extract artist name from profile URL slug
  const artistName = (() => {
    try {
      const url = formData.profileUrl || '';
      const slug = url.split('/').filter(Boolean).pop() || '';
      return decodeURIComponent(slug).replace(/[-_]/g, ' ');
    } catch {
      return '';
    }
  })();
  const fetchSteps = isSongwriter
    ? [
        'Connecting to Genius...',
        'Scanning your profile...',
        'Finding production credits...',
        'Pulling song metadata...',
        'Building your catalog...',
      ]
    : [
        'Connecting to Spotify...',
        'Scanning your profile...',
        'Loading your discography...',
        'Pulling album details...',
        'Building your catalog...',
      ];

  const auditMessages = [
    'Checking registration status...',
    'Matching writer credits...',
    'Verifying ISRC codes...',
    'Scanning metadata...',
    'Cross-referencing publisher data...',
    'Analyzing royalty splits...',
    'Almost done...',
  ];

  // Simulated progress during fetch phase
  useEffect(() => {
    if (phase !== 'fetching') return;
    const stepInterval = setInterval(() => {
      setFetchStep((s) => (s < fetchSteps.length - 1 ? s + 1 : s));
    }, 2200);
    const progressInterval = setInterval(() => {
      setFetchProgress((p) => (p < 85 ? p + Math.random() * 3 + 1 : p));
    }, 300);
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [phase, fetchSteps.length]);

  // Simulated progress during audit phase
  useEffect(() => {
    if (phase !== 'auditing') return;
    const msgInterval = setInterval(() => {
      setAuditMessage((m) => (m < auditMessages.length - 1 ? m + 1 : m));
    }, 2800);
    const progressInterval = setInterval(() => {
      setAuditProgress((p) => {
        if (p >= catalogCount && catalogCount > 0) return p;
        const increment = Math.max(1, Math.floor(catalogCount * (Math.random() * 0.06 + 0.02)));
        return Math.min(p + increment, Math.floor(catalogCount * 0.92));
      });
    }, 400);
    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, [phase, catalogCount, auditMessages.length]);

  useEffect(() => {
    if (results) {
      setPhase('done');
      return;
    }

    const performAudit = async () => {
      try {
        if (!formData.profileUrl) {
          throw new Error('No profile URL provided. Please go back and enter your profile URL.');
        }

        const fetchCatalog = formData.userType === 'songwriter' ? fetchGeniusCatalog : fetchSpotifyCatalog;

        // Phase 1 (fast): Fetch top 30 songs and audit them
        setPhase('fetching');
        const initialCatalog = await fetchCatalog(formData.profileUrl, 30);
        setCatalogCount(initialCatalog.length);

        setPhase('auditing');
        const initialResults = await runAudit(formData, initialCatalog);
        setAuditProgress(initialCatalog.length);
        setResults(initialResults);
        setPhase('done');

        // Phase 2 (background): Fetch full catalog and re-audit everything
        setBackgroundLoading(true);
        try {
          const fullCatalog = await fetchCatalog(formData.profileUrl);
          if (fullCatalog.length > initialCatalog.length) {
            const fullResults = await runAudit(formData, fullCatalog);
            setResults(fullResults);
          }
        } catch (bgError) {
          console.error('Background catalog load error:', bgError);
          // Don't show error — initial results are still valid
        } finally {
          setBackgroundLoading(false);
        }
      } catch (error) {
        console.error('Audit error:', error);
        setErrorMessage(error.message || 'An error occurred while running the audit.');
        setPhase('error');
      }
    };

    performAudit();
  }, []);

  const toggleSong = (id) => {
    setExpandedSongs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateAccount = () => {
    // Extract writer name from audit results (first matched song)
    const matchedSong = results?.songs?.find((s) => s.matchedWriterName);
    const writerName = matchedSong?.matchedWriterName || '';

    // Map audit data to signup pre-fill
    const auditData = {
      accountType: 'individual',
      role: formData.userType === 'songwriter' ? 'songwriter' : 'artist',
      proRegistrations:
        formData.hasPRO === 'yes' && formData.ipNumber
          ? [{ proName: '', writerName, writerIpi: formData.ipNumber }]
          : [],
      hasPublisher: formData.hasPublisher === 'yes' ? true : formData.hasPublisher === 'no' ? false : null,
      publisherName: formData.publisherName || '',
      publisherIpis: formData.publisherIpNumber ? [formData.publisherIpNumber] : [''],
    };
    navigate('/signup', { state: { auditData } });
  };

  // Loading: Fetching catalog
  if (phase === 'fetching') {
    return (
      <div className="step-content">
        <div className="loading-container">
          <div className="spinner" />
          <h3>Fetching your catalog...</h3>
          <div className="fetch-steps">
            {fetchSteps.map((step, i) => (
              <div key={i} className={`fetch-step ${i < fetchStep ? 'done' : i === fetchStep ? 'active' : ''}`}>
                <span className="fetch-step-icon">{i < fetchStep ? '\u2713' : i === fetchStep ? '\u2022' : ''}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="audit-progress-bar">
            <div className="audit-progress-fill" style={{ width: `${fetchProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // Loading: Auditing songs
  if (phase === 'auditing') {
    const displayProgress = Math.min(auditProgress, catalogCount);
    const pct = catalogCount > 0 ? Math.round((displayProgress / catalogCount) * 100) : 0;
    return (
      <div className="step-content">
        <div className="loading-container">
          <div className="spinner" />
          <h3>Auditing {catalogCount} songs...</h3>
          <p className="audit-status-msg">{auditMessages[auditMessage]}</p>
          <div className="audit-progress-bar">
            <div className="audit-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="audit-progress-text">
            {displayProgress} / {catalogCount} checked ({pct}%)
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (phase === 'error') {
    return (
      <div className="step-content">
        <div className="error-container">
          <div className="error-icon">!</div>
          <h3>Audit Error</h3>
          <p>{errorMessage}</p>
          <button className="btn-primary btn-retry" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Results
  if (!results) return null;

  const noPublisher = formData.hasPublisher !== 'yes';
  const registered = results.songs?.filter((s) => s.registered) || [];
  const unregistered = results.songs?.filter((s) => !s.registered) || [];

  // Count backend issues + no-publisher penalty (no publisher = not collecting all royalties)
  const getIssueCount = (song) => (song.issues?.length || 0) + (noPublisher ? 1 : 0);

  // Registered songs split by whether they have actual issues
  const registeredWithIssues = registered.filter((s) => getIssueCount(s) > 0);
  const registeredClean = registered.filter((s) => getIssueCount(s) === 0);
  const hasIssues = unregistered.length > 0 || registeredWithIssues.length > 0 || noPublisher;

  return (
    <div className="step-content results-content">
      {/* Summary Banner + CTA */}
      <div className={`results-summary ${hasIssues ? 'has-issues' : 'all-good'}`}>
        <h3>
          {unregistered.length > 0
            ? `${unregistered.length} of ${results.totalSongs} songs are not registered`
            : registeredWithIssues.length > 0
              ? `We found issues across your catalog`
              : noPublisher
                ? 'Your songs are registered but you have no publisher'
                : `All ${results.totalSongs} songs look good`}
        </h3>
        <p>
          {hasIssues
            ? 'We can fix these issues for you or guide you through it. Create a free account to get started.'
            : 'Create a free account for ongoing monitoring and detailed reports.'}
        </p>
        <button className="btn-cta btn-cta-hero" onClick={handleCreateAccount}>
          Create Free Account
        </button>
        <button className="btn-cta btn-cta-secondary" onClick={() => setShowReportModal(true)}>
          Download Report
        </button>
      </div>

      {showReportModal && (
        <DownloadReportModal
          onClose={() => setShowReportModal(false)}
          results={results}
          artistName={artistName}
          formData={formData}
        />
      )}

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-number">{results.totalSongs}</span>
          <span className="stat-label">Total Songs</span>
        </div>
        <div className={`stat-card ${registered.length > 0 ? 'stat-good' : ''}`}>
          <span className="stat-number">{registered.length}</span>
          <span className="stat-label">Registered</span>
        </div>
        <div className="stat-card stat-bad">
          <span className="stat-number">{unregistered.length}</span>
          <span className="stat-label">Not Registered</span>
        </div>
        <div className={`stat-card ${registeredWithIssues.length > 0 ? 'stat-warn' : 'stat-good'}`}>
          <span className="stat-number">{registeredWithIssues.length}</span>
          <span className="stat-label">Issues Found</span>
        </div>
      </div>

      {/* Background loading banner */}
      {backgroundLoading && (
        <div className="background-loading-banner">
          <div className="background-loading-spinner" />
          <span>Loading remaining songs...</span>
        </div>
      )}

      {/* Overview */}
      {hasIssues && (
        <div className="results-section">
          <h4 className="section-heading section-heading-issue">Overview</h4>
          <div className="results-list">
            {unregistered.length > 0 && (
              <div className="result-item issue-high">
                <p className="result-message">
                  {unregistered.length} song{unregistered.length > 1 ? 's' : ''} may not be properly registered — you
                  could be missing royalties on these works.
                </p>
              </div>
            )}
            {registeredWithIssues.length > 0 && (
              <div className="result-item issue-high">
                <p className="result-message">
                  {registeredWithIssues.length} registered song{registeredWithIssues.length > 1 ? 's have' : ' has'}{' '}
                  metadata issues that could impact your earnings.
                </p>
              </div>
            )}
            {noPublisher && (
              <div className="result-item warning">
                <p className="result-message">You don't have a publisher — you could be leaving money on the table.</p>
              </div>
            )}
            <div className="result-item">
              <p className="result-message result-message-muted">
                Full details and resolution steps are available with a free account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Per-Song Breakdown */}
      <div className="results-section">
        <h4 className="section-heading">Song-by-Song Breakdown</h4>

        <div className="song-filters">
          <button
            className={`filter-btn ${showUnregistered ? 'active-bad' : ''}`}
            onClick={() => setShowUnregistered(!showUnregistered)}
          >
            Unregistered ({unregistered.length})
          </button>
          <button
            className={`filter-btn ${showIssues ? 'active-warn' : ''}`}
            onClick={() => setShowIssues(!showIssues)}
          >
            Issues Found ({registeredWithIssues.length})
          </button>
          <button
            className={`filter-btn ${showRegistered ? 'active-good' : ''}`}
            onClick={() => setShowRegistered(!showRegistered)}
          >
            Registered ({registeredClean.length})
          </button>
        </div>

        <div className="songs-list">
          {/* Unregistered Songs */}
          {showUnregistered &&
            unregistered.map((song) => (
              <div key={song.id} className="song-row song-row-bad" onClick={() => toggleSong(song.id)}>
                <div className="song-row-header">
                  <div className="song-info">
                    {song.albumArt ? (
                      <img src={song.albumArt} alt="" className="song-cover" />
                    ) : (
                      <span className="song-status-dot dot-bad" />
                    )}
                    <div>
                      <span className="song-title">{song.title}</span>
                      <span className="song-artist">{song.artist}</span>
                    </div>
                  </div>
                  <div className="song-badges">
                    <span className="song-badge badge-bad">Unregistered</span>
                    <span className="song-expand">{expandedSongs[song.id] ? '−' : '+'}</span>
                  </div>
                </div>
                {expandedSongs[song.id] && (
                  <div className="song-details">
                    <div className="song-detail-row">
                      <span>Status</span>
                      <span className="match-bad">Not registered</span>
                    </div>
                    <div className="song-detail-row">
                      <span>ISWC</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>ISRC</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Writer</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Publisher</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Writers</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Publishers</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-issue song-issue-link" onClick={handleCreateAccount}>
                      Create a free account to see full details
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* Registered songs with issues */}
          {showIssues &&
            registeredWithIssues.map((song) => {
              const count = getIssueCount(song);
              return (
                <div key={song.id} className="song-row song-row-warn" onClick={() => toggleSong(song.id)}>
                  <div className="song-row-header">
                    <div className="song-info">
                      {song.albumArt ? (
                        <img src={song.albumArt} alt="" className="song-cover" />
                      ) : (
                        <span className="song-status-dot dot-warn" />
                      )}
                      <div>
                        <span className="song-title">{song.title}</span>
                        <span className="song-artist">{song.artist}</span>
                      </div>
                    </div>
                    <div className="song-badges">
                      <span className="song-badge badge-issue">
                        {count} issue{count > 1 ? 's' : ''}
                      </span>
                      <span className="song-expand">{expandedSongs[song.id] ? '−' : '+'}</span>
                    </div>
                  </div>
                  {expandedSongs[song.id] && (
                    <div className="song-details">
                      <div className="song-detail-row">
                        <span>Status</span>
                        <span className="match-good">Registered</span>
                      </div>
                      <div className="song-detail-row">
                        <span>ISWC</span>
                        <span className="redacted">---</span>
                      </div>
                      <div className="song-detail-row">
                        <span>ISRC</span>
                        <span className="redacted">---</span>
                      </div>
                      <div className="song-detail-row">
                        <span>Writer</span>
                        <span className="redacted">---</span>
                      </div>
                      <div className="song-detail-row">
                        <span>Publisher</span>
                        <span className="redacted">---</span>
                      </div>
                      <div className="song-detail-row">
                        <span>Writers</span>
                        <span className="redacted">---</span>
                      </div>
                      <div className="song-detail-row">
                        <span>Publishers</span>
                        <span className="redacted">---</span>
                      </div>
                      {Array.from({ length: count }, (_, i) => (
                        <div key={i} className="song-issue">
                          Issue {i + 1}: <span className="redacted">---</span>
                        </div>
                      ))}
                      <div className="song-issue-cta song-issue-link" onClick={handleCreateAccount}>
                        Create a free account to see full details
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Clean registered songs */}
          {showRegistered &&
            registeredClean.map((song) => (
              <div key={song.id} className="song-row song-row-good" onClick={() => toggleSong(song.id)}>
                <div className="song-row-header">
                  <div className="song-info">
                    {song.albumArt ? (
                      <img src={song.albumArt} alt="" className="song-cover" />
                    ) : (
                      <span className="song-status-dot dot-good" />
                    )}
                    <div>
                      <span className="song-title">{song.title}</span>
                      <span className="song-artist">{song.artist}</span>
                    </div>
                  </div>
                  <div className="song-badges">
                    <span className="song-badge badge-good">Registered</span>
                    <span className="song-expand">{expandedSongs[song.id] ? '−' : '+'}</span>
                  </div>
                </div>
                {expandedSongs[song.id] && (
                  <div className="song-details">
                    <div className="song-detail-row">
                      <span>Status</span>
                      <span className="match-good">Registered</span>
                    </div>
                    <div className="song-detail-row">
                      <span>ISWC</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>ISRC</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Writer</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Publisher</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Writers</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-detail-row">
                      <span>Publishers</span>
                      <span className="redacted">---</span>
                    </div>
                    <div className="song-issue-cta song-issue-link" onClick={handleCreateAccount}>
                      Create a free account to see full details
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      <button className="btn-secondary btn-full" onClick={() => window.location.reload()}>
        Run Another Audit
      </button>
    </div>
  );
}

export default ResultsStep;
