import { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaSave, FaSpinner } from 'react-icons/fa';
import urlJoin from 'url-join';
import './editMappingModal.css';

const EditMappingModal = ({ statement, isOpen, onClose, onSave }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSource, setBulkSource] = useState('');
  const [bulkPlatform, setBulkPlatform] = useState('');

  const sourceOptions = ['BMI', 'ASCAP', 'PRS', 'SESAC', 'SOCAN', 'APRA', 'GEMA', 'SACEM', 'Other'];
  const platformOptions = [
    'Spotify',
    'Apple Music',
    'YouTube',
    'Amazon Music',
    'Tidal',
    'Deezer',
    'Pandora',
    'SoundCloud',
    'Other',
  ];

  useEffect(() => {
    if (isOpen && statement) {
      fetchTransactions();
    }
  }, [isOpen, statement]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, 'revenue/transactions'), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const statementTransactions = data.transactions.filter((t) => t.statementId === statement.id);
        setTransactions(statementTransactions);

        // Set bulk values from first transaction if available
        if (statementTransactions.length > 0) {
          setBulkSource(statementTransactions[0].source || '');
          setBulkPlatform(statementTransactions[0].platform || '');
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/statements/${statement.id}/update-mappings`),
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: bulkSource,
            platform: bulkPlatform,
          }),
        }
      );

      if (response.ok) {
        onSave && onSave();
        onClose();
      } else {
        alert('Failed to update mappings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Failed to update mappings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const uniqueSources = useMemo(() => {
    const sources = [...new Set(transactions.map((t) => t.source).filter(Boolean))];
    return sources;
  }, [transactions]);

  const uniquePlatforms = useMemo(() => {
    const platforms = [...new Set(transactions.map((t) => t.platform).filter(Boolean))];
    return platforms;
  }, [transactions]);

  if (!isOpen) return null;

  return (
    <div className="edit-mapping-backdrop" onClick={(e) => e.target.className === 'edit-mapping-backdrop' && onClose()}>
      <div className="edit-mapping-modal">
        <div className="edit-mapping-header">
          <div className="edit-mapping-title">
            <h2>Edit Mapping</h2>
            <span className="edit-mapping-filename">{statement?.filename}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="edit-mapping-content">
          {loading ? (
            <div className="edit-mapping-loading">
              <FaSpinner className="spinner" />
              <p>Loading transactions...</p>
            </div>
          ) : (
            <>
              <div className="edit-mapping-info">
                <p>
                  <strong>{transactions.length}</strong> transactions in this statement
                </p>
                {uniqueSources.length > 0 && (
                  <p>
                    Current source(s): <strong>{uniqueSources.join(', ') || 'Not set'}</strong>
                  </p>
                )}
                {uniquePlatforms.length > 0 && (
                  <p>
                    Current platform(s): <strong>{uniquePlatforms.join(', ') || 'Not set'}</strong>
                  </p>
                )}
              </div>

              <div className="edit-mapping-form">
                <h3>Update All Transactions</h3>

                <div className="form-row">
                  <label>PRO/CMO Source</label>
                  <select value={bulkSource} onChange={(e) => setBulkSource(e.target.value)}>
                    <option value="">-- Select Source --</option>
                    {sourceOptions.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">e.g., BMI, ASCAP, PRS</span>
                </div>

                <div className="form-row">
                  <label>Streaming Platform</label>
                  <select value={bulkPlatform} onChange={(e) => setBulkPlatform(e.target.value)}>
                    <option value="">-- Select Platform --</option>
                    {platformOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">e.g., Spotify, Apple Music</span>
                </div>
              </div>

              <div className="edit-mapping-preview">
                <h4>Sample Transactions</h4>
                <div className="preview-table">
                  <div className="preview-header">
                    <span>Product</span>
                    <span>Artist</span>
                    <span>Amount</span>
                  </div>
                  {transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="preview-row">
                      <span>{t.product || '-'}</span>
                      <span>{t.artist || '-'}</span>
                      <span>${Number(t.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  {transactions.length > 5 && <div className="preview-more">...and {transactions.length - 5} more</div>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="edit-mapping-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={loading || saving}>
            {saving ? (
              <>
                <FaSpinner className="spinner" /> Saving...
              </>
            ) : (
              <>
                <FaSave /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMappingModal;
