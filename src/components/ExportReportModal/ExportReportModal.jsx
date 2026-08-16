import React, { useState, useMemo } from 'react';
import { FaTimes, FaFileExport, FaCalendarAlt, FaUser, FaFileDownload } from 'react-icons/fa';
import IncomePeriodParser from '../../utils/incomePeriodParser';
import './exportReportModal.css';

const ExportReportModal = ({ isOpen, onClose, transactions, username, currency = 'GBP' }) => {
  const [periodType, setPeriodType] = useState('quarterly');
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedUser, setSelectedUser] = useState(username || '');
  const [exportOptions, setExportOptions] = useState({
    csvTransactions: false,
    summary: false,
    statementOfAccount: false,
  });

  const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  const availablePeriods = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const periodsSet = new Set();

    transactions.forEach((t) => {
      let year, month, quarter;

      // Try to get quarter from IncomePeriodParser first
      if (t.incomePeriod) {
        const quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
        if (quarterKey) {
          const [y, q] = quarterKey.split('-Q');
          year = parseInt(y);
          quarter = parseInt(q);
          // Estimate month from quarter (use middle month)
          month = (quarter - 1) * 3 + 1; // Q1->1, Q2->4, Q3->7, Q4->10
        }
      }

      // Fallback to date parsing
      if (!year && t.date) {
        const date = new Date(t.date);
        if (!isNaN(date.getTime())) {
          year = date.getFullYear();
          month = date.getMonth();
          quarter = Math.ceil((month + 1) / 3);
        }
      }

      if (year && (month !== undefined || quarter)) {
        if (periodType === 'monthly' && month !== undefined) {
          const date = new Date(year, month);
          const monthStr = date.toLocaleString('default', { month: 'short' });
          periodsSet.add(`${monthStr} ${year}`);
        } else if (quarter) {
          periodsSet.add(`Q${quarter} ${year}`);
        }
      }
    });

    return Array.from(periodsSet).sort((a, b) => {
      const parseDate = (str) => {
        if (str.startsWith('Q')) {
          const parts = str.split(' ');
          const q = parseInt(parts[0].replace('Q', ''));
          const year = parseInt(parts[1]);
          return new Date(year, (q - 1) * 3);
        } else {
          return new Date(str);
        }
      };
      return parseDate(b) - parseDate(a);
    });
  }, [transactions, periodType]);

  const users = useMemo(() => {
    if (!username) return [];
    return [username];
  }, [username]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target.className === 'export-modal-backdrop') {
      onClose();
    }
  };

  const togglePeriod = (period) => {
    setSelectedPeriods((prev) => (prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period]));
  };

  const handleExportOptionChange = (option) => {
    setExportOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const getFilteredTransactions = () => {
    if (!transactions || selectedPeriods.length === 0) return [];

    return transactions.filter((t) => {
      let periodKey;
      let year, month, quarter;

      // Try to get quarter from IncomePeriodParser first
      if (t.incomePeriod) {
        const quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
        if (quarterKey) {
          const [y, q] = quarterKey.split('-Q');
          year = parseInt(y);
          quarter = parseInt(q);
          month = (quarter - 1) * 3 + 1;
        }
      }

      // Fallback to date parsing
      if (!year && t.date) {
        const date = new Date(t.date);
        if (!isNaN(date.getTime())) {
          year = date.getFullYear();
          month = date.getMonth();
          quarter = Math.ceil((month + 1) / 3);
        }
      }

      if (year && (month !== undefined || quarter)) {
        if (periodType === 'monthly' && month !== undefined) {
          const date = new Date(year, month);
          const monthStr = date.toLocaleString('default', { month: 'short' });
          periodKey = `${monthStr} ${year}`;
        } else if (quarter) {
          periodKey = `Q${quarter} ${year}`;
        }
      }

      return periodKey && selectedPeriods.includes(periodKey);
    });
  };

  const getIncomeBreakdown = (filteredTx) => {
    const breakdown = {};
    filteredTx.forEach((t) => {
      const category = t.incomeType || t.source || 'Other';
      if (!breakdown[category]) breakdown[category] = 0;
      breakdown[category] += parseFloat(t.amount) || 0;
    });
    return breakdown;
  };

  const exportCSV = (filteredTx) => {
    const headers = ['Date', 'Description', 'Source', 'Income Type', 'Amount', 'Territory'];
    const rows = filteredTx.map((t) => [
      t.date || '',
      t.product || t.description || '',
      t.source || '',
      t.incomeType || '',
      t.amount || 0,
      t.territory || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedUser}_transactions_${selectedPeriods.join('_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSummary = (filteredTx) => {
    const breakdown = getIncomeBreakdown(filteredTx);
    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const periodLabel = selectedPeriods.length === 1 ? selectedPeriods[0] : selectedPeriods.join(', ');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Royalty Statement - ${selectedUser}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
          .logo { font-size: 12px; color: #666; }
          .title { text-align: center; margin-bottom: 10px; }
          .title h1 { font-size: 18px; font-weight: bold; margin: 0; letter-spacing: 2px; }
          .period { font-size: 14px; color: #333; margin-top: 5px; }
          .client-name { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0 30px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 12px; font-weight: bold; color: #666; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .line-item { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
          .line-item.indent { padding-left: 20px; color: #555; }
          .total-line { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; font-weight: bold; border-top: 1px solid #333; margin-top: 10px; }
          .net-amount { display: flex; justify-content: space-between; padding: 15px 0; font-size: 16px; font-weight: bold; border-top: 2px solid #333; margin-top: 20px; }
          .footer { margin-top: 40px; font-size: 11px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">+ Publishing Demo Mode Reference</div>
        </div>
        <div class="title">
          <h1>ROYALTY STATEMENT</h1>
          <div class="period">${periodLabel}</div>
        </div>
        <div class="client-name">${selectedUser}</div>
        
        <div class="section">
          <div class="section-title">INCOME</div>
          ${Object.entries(breakdown)
            .map(
              ([category, amount]) =>
                `<div class="line-item indent">${category} <span>${currencySymbol}${amount.toFixed(2)}</span></div>`
            )
            .join('')}
        </div>
        
        <div class="total-line">
          <span>TOTAL INCOME</span>
          <span>${currencySymbol}${total.toFixed(2)}</span>
        </div>
        
        <div class="net-amount">
          <span>NET AMOUNT</span>
          <span>${currencySymbol}${total.toFixed(2)}</span>
        </div>
        
        <div class="footer">
          All amounts are in ${currency}<br>
          Run No: 1 ${dateStr} ${timeStr}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const exportStatementOfAccount = (filteredTx) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB');

    const periodTotals = {};
    selectedPeriods.forEach((period) => {
      periodTotals[period] = 0;
    });

    filteredTx.forEach((t) => {
      let date;
      if (t.incomePeriod) {
        const parsed = t.incomePeriod.match(/(\d{4})/);
        if (parsed) {
          const year = parseInt(parsed[1]);
          const monthMatch = t.incomePeriod.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
          if (monthMatch) {
            const monthMap = {
              jan: 0,
              feb: 1,
              mar: 2,
              apr: 3,
              may: 4,
              jun: 5,
              jul: 6,
              aug: 7,
              sep: 8,
              oct: 9,
              nov: 10,
              dec: 11,
            };
            date = new Date(year, monthMap[monthMatch[1].toLowerCase()]);
          }
        }
      }
      if (!date && t.date) date = new Date(t.date);

      if (date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = date.getMonth();
        let periodKey;
        if (periodType === 'monthly') {
          const monthStr = date.toLocaleString('default', { month: 'short' });
          periodKey = `${monthStr} ${year}`;
        } else {
          const quarter = Math.ceil((month + 1) / 3);
          periodKey = `Q${quarter} ${year}`;
        }
        if (periodTotals[periodKey] !== undefined) {
          periodTotals[periodKey] += parseFloat(t.amount) || 0;
        }
      }
    });

    const openingBalance = 0;
    let runningBalance = openingBalance;
    const rows = Object.entries(periodTotals)
      .sort((a, b) => {
        const parseDate = (str) => {
          if (str.startsWith('Q')) {
            const [q, year] = str.split(' ');
            return new Date(parseInt(year), (parseInt(q[1]) - 1) * 3);
          }
          return new Date(str);
        };
        return parseDate(a[0]) - parseDate(b[0]);
      })
      .map(([period, amount]) => {
        runningBalance += amount;
        const periodCode = period
          .replace(' ', '')
          .replace('Q', '')
          .replace(/(\d)(\d{4})/, '$2H$1');
        return { date: dateStr, description: periodCode, amount, balance: runningBalance };
      });

    const closingBalance = runningBalance;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Statement of Account - ${selectedUser}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
          .logo { font-size: 12px; color: #666; }
          .title { text-align: center; margin-bottom: 10px; }
          .title h1 { font-size: 18px; font-weight: bold; margin: 0; letter-spacing: 2px; }
          .date { font-size: 14px; color: #333; margin-top: 5px; }
          .client-name { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; font-size: 12px; font-weight: bold; color: #666; padding: 10px 5px; border-bottom: 2px solid #333; }
          th:nth-child(3), th:nth-child(4) { text-align: right; }
          td { padding: 10px 5px; font-size: 14px; border-bottom: 1px solid #eee; }
          td:nth-child(3), td:nth-child(4) { text-align: right; }
          .opening-balance td { color: #666; font-style: italic; }
          .closing-row { font-weight: bold; background: #f5f5f5; }
          .closing-row td { border-top: 2px solid #333; border-bottom: none; }
          .footer { margin-top: 40px; font-size: 11px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">+ Publishing Demo Mode Reference</div>
        </div>
        <div class="title">
          <h1>STATEMENT OF ACCOUNT</h1>
          <div class="date">${dateStr}</div>
        </div>
        <div class="client-name">${selectedUser}</div>
        
        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>DESCRIPTION</th>
              <th>AMOUNT</th>
              <th>BALANCE</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-balance">
              <td></td>
              <td>Opening Balance</td>
              <td></td>
              <td>${currencySymbol}${openingBalance.toFixed(2)}</td>
            </tr>
            ${rows
              .map(
                (row) => `
              <tr>
                <td>${row.date}</td>
                <td>${row.description}</td>
                <td>${currencySymbol}${row.amount.toFixed(2)}</td>
                <td>${currencySymbol}${row.balance.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
            <tr class="closing-row">
              <td></td>
              <td>CLOSING BALANCE</td>
              <td></td>
              <td>${currencySymbol}${closingBalance.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          All amounts are in ${currency}<br>
          Run No: 1 ${dateStr} ${timeStr}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const filteredTx = getFilteredTransactions();

    if (exportOptions.csvTransactions) {
      exportCSV(filteredTx);
    }
    if (exportOptions.summary) {
      exportSummary(filteredTx);
    }
    if (exportOptions.statementOfAccount) {
      exportStatementOfAccount(filteredTx);
    }

    onClose();
  };

  const canExport = selectedPeriods.length > 0 && Object.values(exportOptions).some((v) => v);

  return (
    <div className="export-modal-backdrop" onClick={handleBackdropClick}>
      <div className="export-modal">
        <div className="export-modal-header">
          <div className="export-modal-title">
            <FaFileExport className="modal-title-icon" />
            <h2>Create Custom Report</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="export-modal-content">
          <div className="export-section">
            <div className="section-label">
              <FaCalendarAlt />
              <span>Select Period Type</span>
            </div>
            <div className="period-type-toggle">
              <button
                className={`toggle-btn ${periodType === 'monthly' ? 'active' : ''}`}
                onClick={() => {
                  setPeriodType('monthly');
                  setSelectedPeriods([]);
                }}
              >
                Monthly
              </button>
              <button
                className={`toggle-btn ${periodType === 'quarterly' ? 'active' : ''}`}
                onClick={() => {
                  setPeriodType('quarterly');
                  setSelectedPeriods([]);
                }}
              >
                Quarterly
              </button>
            </div>
          </div>

          <div className="export-section">
            <div className="section-label">
              <FaCalendarAlt />
              <span>Select Time Periods</span>
            </div>
            {availablePeriods.length > 0 && (
              <div className="period-actions">
                <button
                  type="button"
                  className="period-action-btn"
                  onClick={() => setSelectedPeriods([...availablePeriods])}
                >
                  Select All
                </button>
                <button type="button" className="period-action-btn" onClick={() => setSelectedPeriods([])}>
                  Clear All
                </button>
              </div>
            )}
            <div className="periods-list">
              {availablePeriods.length === 0 ? (
                <div className="no-periods">No periods available</div>
              ) : (
                availablePeriods.map((period) => (
                  <label key={period} className="period-item">
                    <input
                      type="checkbox"
                      checked={selectedPeriods.includes(period)}
                      onChange={() => togglePeriod(period)}
                    />
                    <span className="period-label">{period}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="export-section">
            <div className="section-label">
              <FaUser />
              <span>Select User</span>
            </div>
            <select className="user-dropdown" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              {users.length === 0 ? (
                <option value="">No users available</option>
              ) : (
                users.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="export-section">
            <div className="section-label">
              <FaFileDownload />
              <span>Export Options</span>
            </div>
            <div className="export-options">
              <label className="export-option">
                <input
                  type="checkbox"
                  checked={exportOptions.csvTransactions}
                  onChange={() => handleExportOptionChange('csvTransactions')}
                />
                <span>CSV of All Transactions</span>
              </label>
              <label className="export-option">
                <input
                  type="checkbox"
                  checked={exportOptions.summary}
                  onChange={() => handleExportOptionChange('summary')}
                />
                <span>Summary</span>
              </label>
              <label className="export-option">
                <input
                  type="checkbox"
                  checked={exportOptions.statementOfAccount}
                  onChange={() => handleExportOptionChange('statementOfAccount')}
                />
                <span>Statement of Account</span>
              </label>
            </div>
          </div>
        </div>

        <div className="export-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="export-btn" onClick={handleExport} disabled={!canExport}>
            <FaFileExport />
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
