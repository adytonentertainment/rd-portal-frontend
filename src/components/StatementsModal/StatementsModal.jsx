import React from 'react';
import { FaTimes, FaFileAlt, FaTrash, FaEdit, FaDollarSign, FaListUl } from 'react-icons/fa';
import './statementsModal.css';

const StatementsModal = ({ statements, isOpen, onClose, onDeleteStatement, onEditMapping }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target.className === 'statements-modal-backdrop') {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="statements-modal-backdrop" onClick={handleBackdropClick}>
      <div className="statements-modal">
        <div className="statements-modal-header">
          <div className="statements-modal-title">
            <h2>Statements</h2>
            <span className="statements-count">{statements.length}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="statements-modal-content">
          {statements.length === 0 ? (
            <div className="no-statements">
              <FaFileAlt className="no-statements-icon" />
              <p>No statements uploaded yet</p>
              <p className="no-statements-hint">Upload a CSV or PDF statement to get started</p>
            </div>
          ) : (
            <div className="statements-table">
              <div className="statements-table-header">
                <div className="col-file">File</div>
                <div className="col-date">Uploaded</div>
                <div className="col-transactions">Transactions</div>
                <div className="col-amount">Total</div>
                <div className="col-actions">Actions</div>
              </div>
              <div className="statements-table-body">
                {statements.map((statement) => (
                  <div key={statement.id} className="statement-row">
                    <div className="col-file">
                      <FaFileAlt className="file-icon" />
                      <span className="filename" title={statement.filename}>
                        {statement.filename}
                      </span>
                    </div>
                    <div className="col-date">{formatDate(statement.uploadDate)}</div>
                    <div className="col-transactions">
                      <FaListUl className="meta-icon" />
                      {(statement.transactionCount || 0).toLocaleString()}
                    </div>
                    <div className="col-amount">
                      <FaDollarSign className="meta-icon" />
                      {formatCurrency(statement.totalAmount)}
                    </div>
                    <div className="col-actions">
                      {onEditMapping && (
                        <button
                          className="action-btn edit-btn"
                          onClick={() => onEditMapping(statement)}
                          title="Edit column mapping"
                        >
                          <FaEdit />
                        </button>
                      )}
                      <button
                        className="action-btn delete-btn"
                        onClick={() => onDeleteStatement(statement.id)}
                        title="Delete statement"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatementsModal;
