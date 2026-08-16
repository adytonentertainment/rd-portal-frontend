import React, { useState, useEffect, useMemo } from 'react';
import {
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaLightbulb,
  FaCheckCircle,
  FaTimesCircle,
  FaMagic,
} from 'react-icons/fa';
import './ColumnMappingModal.css';

const ColumnMappingModal = ({
  isOpen,
  onClose,
  onConfirm,
  csvHeaders,
  suggestedMapping,
  sampleData,
  fileName,
  detectedProfile,
  detectionConfidence,
}) => {
  const [columnMapping, setColumnMapping] = useState({});
  const [decimalCorrection, setDecimalCorrection] = useState(false);
  const [decimalDivider, setDecimalDivider] = useState(100);
  const [skipRows, setSkipRows] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Available fields grouped by category
  const fieldGroups = [
    {
      label: 'Required',
      fields: [{ value: 'amount', label: 'Amount / Revenue', required: true, icon: '💰' }],
    },
    {
      label: 'Time & Period',
      fields: [
        { value: 'date', label: 'Date', required: false, icon: '📅' },
        { value: 'incomePeriod', label: 'Income Period (Q1 2024, Jan 2024)', required: false, icon: '📆' },
        { value: 'incomePeriodCategory', label: 'Period Category / Type', required: false, icon: '🏷️' },
      ],
    },
    {
      label: 'Content',
      fields: [
        { value: 'product', label: 'Song / Track / Product', required: false, icon: '🎵' },
        { value: 'artist', label: 'Artist', required: false, icon: '🎤' },
        { value: 'isrc', label: 'ISRC', required: false, icon: '🔢' },
        { value: 'upc', label: 'UPC', required: false, icon: '📊' },
      ],
    },
    {
      label: 'Source & Category',
      fields: [
        { value: 'source', label: 'PRO/CMO (BMI, PRS, ASCAP)', required: false, icon: '🏛️' },
        { value: 'platform', label: 'Platform/DSP (Spotify, Apple)', required: false, icon: '📡' },
        { value: 'category', label: 'Income Type (Streaming, Sync)', required: false, icon: '📁' },
        { value: 'incomeName', label: 'Income Name', required: false, icon: '📝' },
      ],
    },
    {
      label: 'Location & Other',
      fields: [
        { value: 'territory', label: 'Territory / Country', required: false, icon: '🌍' },
        { value: 'currency', label: 'Currency', required: false, icon: '💱' },
        { value: 'quantity', label: 'Quantity / Units', required: false, icon: '🔢' },
        { value: 'label', label: 'Label', required: false, icon: '🏢' },
      ],
    },
  ];

  const availableFields = useMemo(() => {
    const fields = [{ value: '', label: '-- Skip this column --', icon: '⏭️' }];
    fieldGroups.forEach((group) => {
      group.fields.forEach((f) => fields.push(f));
    });
    return fields;
  }, []);

  // Smart auto-detection based on header names and sample data
  const autoDetectMapping = (headers, samples) => {
    const mapping = {};
    const headerPatterns = {
      amount: /^(amount|revenue|royalt|net|gross|total|payment|earning|value|sum)s?$/i,
      date: /^(date|period.?date|payment.?date|transaction.?date|sale.?date)$/i,
      incomePeriod: /^(income.?period|period|reporting.?period|statement.?period|quarter|month)$/i,
      product: /^(product|song|track|title|release|asset|work|composition)s?$/i,
      artist: /^(artist|performer|writer|author|creator|contributor)s?$/i,
      source: /^(source|pro|cmo|society|collecting)$/i,
      platform: /^(platform|service|store|provider|dsp|distributor|retailer)$/i,
      territory: /^(territory|country|region|market|geo|location)s?$/i,
      category: /^(type|category|income.?type|revenue.?type|usage.?type|right)s?$/i,
      isrc: /^(isrc|isrc.?code)$/i,
      upc: /^(upc|barcode|ean)$/i,
      currency: /^(currency|curr|ccy)$/i,
      quantity: /^(quantity|qty|units|streams|plays|downloads|count)$/i,
      label: /^(label|record.?label|publisher)$/i,
      incomeName: /^(income.?name|description|line.?item)$/i,
    };

    headers.forEach((header, idx) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sample = samples?.[0]?.[idx] || '';

      for (const [field, pattern] of Object.entries(headerPatterns)) {
        if (pattern.test(header) || pattern.test(normalizedHeader)) {
          if (!Object.values(mapping).includes(field)) {
            mapping[header] = field;
            break;
          }
        }
      }

      // Fallback detection from sample data
      if (!mapping[header] && sample) {
        const sampleLower = sample.toLowerCase();
        if (/^-?\d+\.?\d*$/.test(sample.replace(/[,$£€]/g, '')) && !Object.values(mapping).includes('amount')) {
          if (parseFloat(sample.replace(/[,$£€]/g, '')) !== 0) {
            mapping[header] = 'amount';
          }
        } else if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(sample) && !Object.values(mapping).includes('date')) {
          mapping[header] = 'date';
        } else if (/^[A-Z]{2}[A-Z0-9]{10}$/.test(sample) && !Object.values(mapping).includes('isrc')) {
          mapping[header] = 'isrc';
        } else if (/^(US|GB|DE|FR|JP|AU|CA|[A-Z]{2})$/i.test(sample) && !Object.values(mapping).includes('territory')) {
          mapping[header] = 'territory';
        } else if (/^(USD|GBP|EUR|CAD|AUD|JPY)$/i.test(sample) && !Object.values(mapping).includes('currency')) {
          mapping[header] = 'currency';
        } else if (
          /^(bmi|ascap|sesac|prs|mcps|gema|sacem|siae|sgae|apra|socan|jasrac)$/i.test(sample) &&
          !Object.values(mapping).includes('source')
        ) {
          mapping[header] = 'source';
        } else if (
          (sampleLower.includes('spotify') ||
            sampleLower.includes('apple') ||
            sampleLower.includes('youtube') ||
            sampleLower.includes('amazon') ||
            sampleLower.includes('tidal') ||
            sampleLower.includes('deezer')) &&
          !Object.values(mapping).includes('platform')
        ) {
          mapping[header] = 'platform';
        }
      }
    });

    return mapping;
  };

  // Apply mapping from detected profile
  const applyProfileMapping = () => {
    if (!detectedProfile || !csvHeaders) return;

    const mapping = {};
    const normalizeHeader = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Build mapping from profile headerMapping by matching header names
    csvHeaders.forEach((csvHeader) => {
      const normalizedCsvHeader = normalizeHeader(csvHeader);

      // Check if this header is in the profile's headerMapping
      if (detectedProfile.headerMapping) {
        Object.entries(detectedProfile.headerMapping).forEach(([profileHeader, field]) => {
          const normalizedProfileHeader = normalizeHeader(profileHeader);
          if (normalizedCsvHeader === normalizedProfileHeader) {
            mapping[csvHeader] = field;
          }
        });
      }
    });

    setColumnMapping(mapping);
  };

  useEffect(() => {
    if (isOpen) {
      if (suggestedMapping && Object.keys(suggestedMapping).length > 0) {
        setColumnMapping(suggestedMapping);
      } else if (detectedProfile) {
        // Auto-apply detected profile mapping on mount
        applyProfileMapping();
      } else if (csvHeaders && csvHeaders.length > 0) {
        const detected = autoDetectMapping(csvHeaders, sampleData);
        setColumnMapping(detected);
      }
    }
  }, [isOpen, suggestedMapping, csvHeaders, sampleData, detectedProfile]);

  const handleMappingChange = (csvColumn, field) => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvColumn]: field,
    }));
  };

  const getFieldUsageCount = (field) => {
    if (!field) return 0;
    return Object.values(columnMapping).filter((f) => f === field).length;
  };

  const getFieldInfo = (fieldValue) => {
    return availableFields.find((f) => f.value === fieldValue);
  };

  const getOrgTypeBadge = (orgType) => {
    const badges = {
      pro: { label: 'PRO', color: '#3b82f6' }, // blue
      cmo: { label: 'CMO', color: '#a855f7' }, // purple
      publisher: { label: 'Publisher', color: '#10b981' }, // green
    };
    return badges[orgType] || { label: orgType?.toUpperCase() || 'Unknown', color: '#6b7280' };
  };

  const mappingStats = useMemo(() => {
    const mapped = Object.values(columnMapping).filter((v) => v).length;
    const total = csvHeaders?.length || 0;
    const hasAmount = Object.values(columnMapping).includes('amount');
    const hasProduct = Object.values(columnMapping).includes('product');
    const hasPeriod =
      Object.values(columnMapping).includes('incomePeriod') || Object.values(columnMapping).includes('date');
    return { mapped, total, hasAmount, hasProduct, hasPeriod };
  }, [columnMapping, csvHeaders]);

  const handleResetMapping = () => {
    setColumnMapping({});
  };

  const handleAutoDetect = () => {
    if (csvHeaders && csvHeaders.length > 0) {
      const detected = autoDetectMapping(csvHeaders, sampleData);
      setColumnMapping(detected);
    }
  };

  const handleConfirm = () => {
    if (!mappingStats.hasAmount) {
      alert('Please map at least one column to Amount/Revenue');
      return;
    }

    onConfirm({
      columnMapping,
      decimalCorrection,
      decimalDivider,
      skipRows,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="column-mapping-modal-overlay">
      <div className="column-mapping-modal">
        <div className="modal-header">
          <div className="modal-header-left">
            <h2>Map Statement Columns</h2>
            <span className="file-badge">{fileName}</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {/* Status Bar */}
          <div className="mapping-status-bar">
            <div className="status-item">
              <span className="status-label">Columns</span>
              <span className="status-value">
                {mappingStats.mapped}/{mappingStats.total} mapped
              </span>
            </div>
            <div className={`status-item ${mappingStats.hasAmount ? 'success' : 'error'}`}>
              {mappingStats.hasAmount ? <FaCheckCircle /> : <FaTimesCircle />}
              <span>Amount</span>
            </div>
            <div className={`status-item ${mappingStats.hasProduct ? 'success' : 'warning'}`}>
              {mappingStats.hasProduct ? <FaCheckCircle /> : <FaLightbulb />}
              <span>Song/Track</span>
            </div>
            <div className={`status-item ${mappingStats.hasPeriod ? 'success' : 'warning'}`}>
              {mappingStats.hasPeriod ? <FaCheckCircle /> : <FaLightbulb />}
              <span>Period/Date</span>
            </div>
            <div className="status-actions">
              <button className="action-btn" onClick={handleAutoDetect} title="Auto-detect columns">
                <FaMagic /> Auto-detect
              </button>
              <button className="action-btn secondary" onClick={handleResetMapping} title="Clear all mappings">
                Clear All
              </button>
            </div>
          </div>

          {/* Profile Detection Banner */}
          {detectedProfile && (
            <div className="profile-detection-banner">
              <div className="detection-info">
                <div
                  className="org-type-badge"
                  style={{
                    backgroundColor: `${getOrgTypeBadge(detectedProfile.orgType).color}20`,
                    color: getOrgTypeBadge(detectedProfile.orgType).color,
                  }}
                >
                  {getOrgTypeBadge(detectedProfile.orgType).label}
                </div>
                <div className="detection-details">
                  <div className="profile-name">{detectedProfile.name}</div>
                  <div className="confidence-info">
                    <span className="confidence-badge">{Math.round(detectionConfidence)}% match</span>
                  </div>
                </div>
              </div>
              <button className="apply-mapping-btn" onClick={applyProfileMapping}>
                <FaMagic /> Apply Mapping
              </button>
            </div>
          )}

          {/* Column Mapping Cards */}
          <div className="mapping-section">
            <div className="mapping-cards">
              {csvHeaders?.map((header, index) => {
                const field = columnMapping[header] || '';
                const fieldInfo = getFieldInfo(field);
                const isDuplicate = field && getFieldUsageCount(field) > 1;
                const sampleValue = sampleData?.[0]?.[index] || '';
                const isRequired = field === 'amount';
                const isMapped = !!field;

                return (
                  <div
                    key={index}
                    className={`mapping-card ${isMapped ? 'mapped' : ''} ${isRequired ? 'required' : ''}`}
                  >
                    <div className="card-header">
                      <div className="csv-column-name">{header}</div>
                      {isMapped && <span className="mapped-badge">{fieldInfo?.icon}</span>}
                    </div>
                    <div className="card-sample">
                      <span className="sample-label">Sample:</span>
                      <span className="sample-value">{sampleValue || '(empty)'}</span>
                    </div>
                    <div className="card-mapping">
                      <select
                        value={field}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className={`mapping-select ${isDuplicate ? 'warning' : ''} ${isMapped ? 'has-value' : ''}`}
                      >
                        {availableFields.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.icon} {f.label}
                            {f.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                      {isDuplicate && (
                        <div className="duplicate-warning">
                          <FaExclamationTriangle /> Already mapped
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="advanced-toggle">
            <button className="toggle-advanced-btn" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>
          </div>

          {/* Data Correction Options */}
          {showAdvanced && (
            <div className="correction-section">
              <div className="option-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={decimalCorrection}
                    onChange={(e) => setDecimalCorrection(e.target.checked)}
                  />
                  <span>Decimal Correction</span>
                </label>
                <p className="hint">Enable if amounts appear wrong (e.g., 1234 instead of 12.34)</p>

                {decimalCorrection && (
                  <div className="sub-option">
                    <label>
                      Divide amounts by:
                      <select value={decimalDivider} onChange={(e) => setDecimalDivider(Number(e.target.value))}>
                        <option value={1}>1 (no change)</option>
                        <option value={10}>10</option>
                        <option value={100}>100 (cents to dollars)</option>
                        <option value={1000}>1,000</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className="option-group">
                <label className="inline-option">
                  <span>Skip first</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={skipRows}
                    onChange={(e) => setSkipRows(Number(e.target.value))}
                    className="small-input"
                  />
                  <span>rows of data</span>
                </label>
                <p className="hint">Use if your CSV has header/summary rows before actual data</p>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {sampleData && sampleData.length > 0 && (
            <div className="preview-section">
              <h3>Data Preview</h3>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {csvHeaders?.map((header, idx) => {
                        const field = columnMapping[header];
                        const fieldInfo = getFieldInfo(field);
                        return (
                          <th key={idx} className={field ? 'mapped-header' : ''}>
                            <div className="header-content">
                              <span className="header-name">{header}</span>
                              {field && (
                                <span className="header-mapping">
                                  {fieldInfo?.icon} {field}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.slice(0, 3).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className={columnMapping[csvHeaders?.[cellIdx]] ? 'mapped-cell' : ''}>
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-info">
            {!mappingStats.hasAmount && (
              <span className="footer-warning">
                <FaExclamationTriangle /> Amount column required
              </span>
            )}
          </div>
          <div className="footer-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-confirm" onClick={handleConfirm} disabled={!mappingStats.hasAmount}>
              <FaCheck /> Import Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMappingModal;
