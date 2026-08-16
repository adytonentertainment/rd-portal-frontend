import React, { useState } from 'react';
import { toast } from 'react-toastify';
import urlJoin from 'url-join';

const PUBLISHER_TYPES = [
  { value: '', label: 'Select...' },
  { value: 'E', label: 'E - Original Publisher' },
  { value: 'AM', label: 'AM - Administrator' },
  { value: 'SE', label: 'SE - Sub-Publisher' },
  { value: 'ES', label: 'ES - Substituted Publisher' },
];

const PRO_OPTIONS = [
  '',
  'ASCAP',
  'BMI',
  'SESAC',
  'PRS',
  'SOCAN',
  'GEMA',
  'SACEM',
  'JASRAC',
  'APRA',
  'SIAE',
  'SGAE',
  'BUMA/STEMRA',
];

const BulkEditModal = ({ isOpen, onClose, selectedTrackIds, onSuccess }) => {
  const [includeMaster, setIncludeMaster] = useState(false);
  const [includePublishing, setIncludePublishing] = useState(false);
  const [includePro, setIncludePro] = useState(false);
  const [includePublisherType, setIncludePublisherType] = useState(false);
  const [masterValue, setMasterValue] = useState(0);
  const [publishingValue, setPublishingValue] = useState(0);
  const [proValue, setProValue] = useState('');
  const [publisherTypeValue, setPublisherTypeValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const hasAnyField = includeMaster || includePublishing || includePro || includePublisherType;

  const handleApply = async () => {
    if (!hasAnyField) return;

    const updates = {};
    if (includeMaster) updates.master_royalty = masterValue / 100;
    if (includePublishing) updates.publishing_royalty = publishingValue / 100;
    if (includePro) updates.pro = proValue || null;
    if (includePublisherType) updates.publisher_type = publisherTypeValue || null;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, 'catalog/tracks/bulk-update'), {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          track_ids: selectedTrackIds,
          updates,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast(`${data.message}`);
        onSuccess && onSuccess();
        onClose();
      } else {
        toast.error('Bulk update failed.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Bulk update failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--button-border)',
    background: 'var(--panel-bg)',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
  };

  const inputStyle = {
    ...selectStyle,
    width: '80px',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '12px',
          padding: '24px',
          width: '420px',
          maxWidth: '90vw',
        }}
      >
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>Bulk Edit</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--soft-text)' }}>
          Apply changes to {selectedTrackIds.length} selected work{selectedTrackIds.length !== 1 ? 's' : ''}. Check the
          fields you want to update.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Master Royalty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked={includeMaster} onChange={() => setIncludeMaster(!includeMaster)} />
            <label style={{ fontSize: '13px', minWidth: '120px', fontWeight: 500 }}>Master %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={masterValue}
              onChange={(e) => setMasterValue(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              disabled={!includeMaster}
              style={{ ...inputStyle, opacity: includeMaster ? 1 : 0.4 }}
            />
          </div>

          {/* Publishing Royalty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={includePublishing}
              onChange={() => setIncludePublishing(!includePublishing)}
            />
            <label style={{ fontSize: '13px', minWidth: '120px', fontWeight: 500 }}>Publishing %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={publishingValue}
              onChange={(e) => setPublishingValue(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              disabled={!includePublishing}
              style={{ ...inputStyle, opacity: includePublishing ? 1 : 0.4 }}
            />
          </div>

          {/* PRO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked={includePro} onChange={() => setIncludePro(!includePro)} />
            <label style={{ fontSize: '13px', minWidth: '120px', fontWeight: 500 }}>PRO</label>
            <select
              value={proValue}
              onChange={(e) => setProValue(e.target.value)}
              disabled={!includePro}
              style={{ ...selectStyle, opacity: includePro ? 1 : 0.4, flex: 1 }}
            >
              {PRO_OPTIONS.map((pro) => (
                <option key={pro} value={pro}>
                  {pro || 'None'}
                </option>
              ))}
            </select>
          </div>

          {/* Publisher Type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={includePublisherType}
              onChange={() => setIncludePublisherType(!includePublisherType)}
            />
            <label style={{ fontSize: '13px', minWidth: '120px', fontWeight: 500 }}>Publisher Type</label>
            <select
              value={publisherTypeValue}
              onChange={(e) => setPublisherTypeValue(e.target.value)}
              disabled={!includePublisherType}
              style={{ ...selectStyle, opacity: includePublisherType ? 1 : 0.4, flex: 1 }}
            >
              {PUBLISHER_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--button-border)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!hasAnyField || loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: hasAnyField && !loading ? '#8b5cf6' : '#555',
              color: '#fff',
              fontSize: '13px',
              cursor: hasAnyField && !loading ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              opacity: hasAnyField && !loading ? 1 : 0.6,
            }}
          >
            {loading
              ? 'Applying...'
              : `Apply to ${selectedTrackIds.length} work${selectedTrackIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
