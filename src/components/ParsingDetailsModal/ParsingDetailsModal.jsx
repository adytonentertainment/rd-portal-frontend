import React from 'react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTable, FaColumns } from 'react-icons/fa';
import './parsingDetailsModal.css';

const ParsingDetailsModal = ({ isOpen, onClose, parsingResult }) => {
  if (!isOpen || !parsingResult) return null;

  const { success, metadata, transactions } = parsingResult;
  const { totalRows, headerRow, dataStartRow, delimiter, columnMapping, summary } = metadata || {};

  const handleBackdropClick = (e) => {
    if (e.target.className === 'parsing-modal-backdrop') {
      onClose();
    }
  };

  const getDelimiterName = (delimiter) => {
    switch (delimiter) {
      case ',':
        return 'Comma (,)';
      case '\t':
        return 'Tab';
      case ';':
        return 'Semicolon (;)';
      case '|':
        return 'Pipe (|)';
      default:
        return delimiter;
    }
  };

  return (
    <div className="parsing-modal-backdrop" onClick={handleBackdropClick}>
      <div className="parsing-modal">
        <div className="parsing-modal-header">
          <div className="parsing-modal-title">
            {success ? (
              <>
                <FaCheckCircle className="success-icon" />
                <h2>CSV Parsing Successful</h2>
              </>
            ) : (
              <>
                <FaExclamationTriangle className="warning-icon" />
                <h2>CSV Parsing Results</h2>
              </>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="parsing-modal-content">
          {/* File Analysis Section */}
          <div className="parsing-section">
            <h3>
              <FaTable /> File Analysis
            </h3>
            <div className="parsing-details-grid">
              <div className="detail-item">
                <span className="detail-label">Total Rows:</span>
                <span className="detail-value">{totalRows || 0}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Header Row:</span>
                <span className="detail-value">{headerRow !== undefined ? headerRow + 1 : 'Not detected'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Data Starts:</span>
                <span className="detail-value">Row {dataStartRow !== undefined ? dataStartRow + 1 : 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Delimiter:</span>
                <span className="detail-value">{getDelimiterName(delimiter)}</span>
              </div>
            </div>
          </div>

          {/* Column Mapping Section */}
          <div className="parsing-section">
            <h3>
              <FaColumns /> Column Detection
            </h3>
            {columnMapping && Object.keys(columnMapping).length > 0 ? (
              <div className="column-mapping-list">
                {Object.entries(columnMapping).map(([field, colIndex]) => (
                  <div key={field} className="mapping-item">
                    <span className="field-name">{field}:</span>
                    <span className="column-index">Column {colIndex + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-mapping-warning">
                <FaExclamationTriangle />
                <p>No columns were automatically detected.</p>
                <p className="hint">
                  Make sure your CSV has headers like: date, amount, revenue, product, artist, etc.
                </p>
              </div>
            )}
          </div>

          {/* Summary Section */}
          {summary && (
            <div className="parsing-section">
              <h3>
                <FaInfoCircle /> Data Summary
              </h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Transactions Found:</span>
                  <span className="summary-value">{summary.transactionCount}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Amount:</span>
                  <span className="summary-value">${summary.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Average Transaction:</span>
                  <span className="summary-value">${summary.avgTransaction?.toFixed(2) || '0.00'}</span>
                </div>
                {summary.dateRange && (
                  <div className="summary-item">
                    <span className="summary-label">Date Range:</span>
                    <span className="summary-value">
                      {summary.dateRange.start} to {summary.dateRange.end}
                    </span>
                  </div>
                )}
                {summary.sources && summary.sources.length > 0 && (
                  <div className="summary-item full-width">
                    <span className="summary-label">Sources:</span>
                    <span className="summary-value">
                      {summary.sources.slice(0, 5).join(', ')}
                      {summary.sources.length > 5 && ` +${summary.sources.length - 5} more`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sample Transactions */}
          {transactions && transactions.length > 0 && (
            <div className="parsing-section">
              <h3>Sample Transactions (First 5)</h3>
              <div className="sample-transactions">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Product</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 5).map((t, i) => (
                      <tr key={i}>
                        <td>{t.date || 'N/A'}</td>
                        <td>${t.amount?.toFixed(2) || '0.00'}</td>
                        <td>{t.product || 'Unknown'}</td>
                        <td>{t.source || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Help Section */}
          {!success && (
            <div className="parsing-section help-section">
              <h3>💡 Troubleshooting Tips</h3>
              <ul>
                <li>Ensure your CSV has clear headers (e.g., "Amount", "Revenue", "Date", "Product")</li>
                <li>Check that numeric values don't have extra characters (except currency symbols)</li>
                <li>Remove any summary rows or totals that might confuse the parser</li>
                <li>Try saving the file as a standard CSV from Excel or Google Sheets</li>
                <li>If the file is complex, consider cleaning it first or contacting support</li>
              </ul>
            </div>
          )}
        </div>

        <div className="parsing-modal-footer">
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParsingDetailsModal;
