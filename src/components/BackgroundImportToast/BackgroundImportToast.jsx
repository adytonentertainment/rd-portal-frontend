import React from 'react';
import { useBackgroundImport } from '../BackgroundImportContext/BackgroundImportContext';
import './BackgroundImportToast.css';

const BackgroundImportToast = () => {
  const { importStatus, progress, foundSongs, error, cancelFetch, dismissNotification } = useBackgroundImport();

  if (!importStatus) return null;

  const isFetching = importStatus === 'fetching';
  const isComplete = importStatus === 'complete';
  const isError = importStatus === 'error';

  return (
    <div className={`background-import-toast ${isError ? 'error' : isComplete ? 'complete' : ''}`}>
      <div className="toast-content">
        {/* Icon */}
        <div className="toast-icon">
          {isFetching && (
            <div className="spinner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            </div>
          )}
          {isComplete && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
          {isError && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          )}
        </div>

        {/* Message */}
        <div className="toast-message">
          {isFetching && (
            <>
              <span className="toast-title">Fetching from Genius</span>
              <span className="toast-subtitle">
                {progress.songTitle || progress.message}
                {foundSongs.length > 0 && ` (${foundSongs.length} found)`}
              </span>
            </>
          )}
          {isComplete && (
            <>
              <span className="toast-title">Import Ready</span>
              <span className="toast-subtitle">{progress.message}</span>
            </>
          )}
          {isError && (
            <>
              <span className="toast-title">Import Failed</span>
              <span className="toast-subtitle">{error}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="toast-actions">
          {isFetching && (
            <button className="toast-btn cancel" onClick={cancelFetch}>
              Cancel
            </button>
          )}
          {(isComplete || isError) && (
            <button className="toast-btn dismiss" onClick={dismissNotification}>
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for fetching */}
      {isFetching && <div className="toast-progress" />}
    </div>
  );
};

export default BackgroundImportToast;
