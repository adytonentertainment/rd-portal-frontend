import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheckCircle, FaEdit } from 'react-icons/fa';
import SmartCsvParser from '../../utils/smartCsvParser';
import './AutoDetectConfirmModal.css';

const AutoDetectConfirmModal = ({ isOpen, onClose, onImport, onAdjustMapping, csvText, detectedProfile, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && csvText && detectedProfile) {
      parseCSV();
    }
  }, [isOpen, csvText, detectedProfile]);

  const parseCSV = async () => {
    setLoading(true);
    setError(null);
    try {
      const parser = new SmartCsvParser();
      const result = parser.parseWithProfile(csvText, detectedProfile);

      if (result.success) {
        setParseResult(result);
      } else {
        setError('Failed to parse CSV with detected profile');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError(err.message || 'Failed to parse CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (parseResult && parseResult.transactions) {
      onImport(parseResult.transactions, detectedProfile);
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getOrgTypeBadge = (orgType) => {
    const badges = {
      pro: { label: 'PRO', color: '#3b82f6' },
      cmo: { label: 'CMO', color: '#8b5cf6' },
      publisher: { label: 'Publisher', color: '#10b981' },
    };
    return badges[orgType] || { label: orgType, color: '#6b7280' };
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 95) return { label: 'Excellent', color: '#22c55e' };
    if (confidence >= 85) return { label: 'High', color: '#3b82f6' };
    if (confidence >= 70) return { label: 'Good', color: '#f59e0b' };
    return { label: 'Medium', color: '#ef4444' };
  };

  const getDateRange = (transactions) => {
    if (!transactions || transactions.length === 0) return null;

    const dates = transactions
      .map((t) => t.date)
      .filter((d) => d)
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()));

    if (dates.length === 0) return null;

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    return {
      start: minDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      end: maxDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
    };
  };

  if (!isOpen) return null;

  const orgBadge = getOrgTypeBadge(detectedProfile?.orgType);
  const confidenceBadge = getConfidenceBadge(detectedProfile?.confidence || 0);
  const transactionCount = parseResult?.transactions?.length || 0;
  const totalAmount = parseResult?.transactions?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
  const dateRange = parseResult?.transactions ? getDateRange(parseResult.transactions) : null;
  const sampleTransactions = parseResult?.transactions?.slice(0, 5) || [];

  return (
    <div className="auto-detect-modal-overlay">
      <div className="auto-detect-modal">
        <div className="modal-header">
          <div className="modal-header-left">
            <h2>Statement Auto-Detected</h2>
            <span className="file-badge">{fileName}</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {/* Detection Banner */}
          <div className="detection-banner">
            <div className="banner-icon">
              <FaCheckCircle />
            </div>
            <div className="banner-content">
              <div className="banner-title">
                <span className="profile-name">{detectedProfile?.name}</span>
                <span className="org-badge" style={{ background: `${orgBadge.color}20`, color: orgBadge.color }}>
                  {orgBadge.label}
                </span>
                <span
                  className="confidence-badge"
                  style={{ background: `${confidenceBadge.color}20`, color: confidenceBadge.color }}
                >
                  {confidenceBadge.label} Match ({Math.round(detectedProfile?.confidence || 0)}%)
                </span>
              </div>
              <div className="banner-subtitle">
                We recognize this format and can import it automatically using our pre-configured mapping.
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Parsing statement with detected profile...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button className="btn-secondary" onClick={onAdjustMapping}>
                Adjust Mapping Manually
              </button>
            </div>
          )}

          {/* Success State */}
          {!loading && !error && parseResult && (
            <>
              {/* Stats Summary */}
              <div className="stats-summary">
                <div className="stat-card">
                  <div className="stat-label">Transactions</div>
                  <div className="stat-value">{transactionCount.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Amount</div>
                  <div className="stat-value">{formatCurrency(totalAmount)}</div>
                </div>
                {dateRange && (
                  <div className="stat-card">
                    <div className="stat-label">Period</div>
                    <div className="stat-value">
                      {dateRange.start === dateRange.end ? dateRange.start : `${dateRange.start} - ${dateRange.end}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Table */}
              <div className="sample-section">
                <h3>Sample Transactions</h3>
                <div className="sample-table-container">
                  <table className="sample-table">
                    <thead>
                      <tr>
                        <th>Song</th>
                        <th>Artist</th>
                        <th>Amount</th>
                        <th>Source</th>
                        <th>Territory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleTransactions.map((transaction, idx) => (
                        <tr key={idx}>
                          <td className="song-cell">{transaction.product || '—'}</td>
                          <td>{transaction.artist || '—'}</td>
                          <td className="amount-cell">{formatCurrency(transaction.amount)}</td>
                          <td>{transaction.source || '—'}</td>
                          <td>{transaction.territory || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactionCount > 5 && (
                  <p className="sample-note">Showing 5 of {transactionCount.toLocaleString()} transactions</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onAdjustMapping}>
            <FaEdit /> Adjust Mapping
          </button>
          <button className="btn-primary" onClick={handleImport} disabled={loading || error || !parseResult}>
            <FaCheckCircle /> Import {transactionCount > 0 ? `${transactionCount.toLocaleString()} ` : ''}Transactions
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoDetectConfirmModal;
