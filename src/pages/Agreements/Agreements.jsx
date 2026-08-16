import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FaUpload, FaFilter, FaFileAlt, FaTrash } from 'react-icons/fa';
import { IoDocumentText } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { CircularProgress } from '@mui/material';
import { Breadcrumbs, BreadcrumbItem } from '@heroui/react';
import Sidebar from '../../components/Sidebar/Sidebar';
import styles from './agreements.module.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const FILTER_OPTIONS = ['All', 'Producer Agreement', 'Publishing', 'Management'];

const EXTRACTION_METHODS = [
  { value: 'auto', label: 'Auto (Recommended)', description: 'Automatically select best method' },
  { value: 'vision', label: 'Vision API', description: 'Best for scanned/image PDFs' },
  { value: 'standard', label: 'Standard', description: 'Faster, no API calls' },
];

const Agreements = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractionMethod, setExtractionMethod] = useState('auto');
  const [showExtractionOptions, setShowExtractionOptions] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch agreements on mount
  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/agreements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAgreements(data.agreements || []);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem('token');

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('extraction_method', extractionMethod);

        // Show uploading toast
        const uploadToastId = toast.info(`Analyzing ${file.name}...`, {
          autoClose: false,
          closeButton: false,
        });

        const response = await fetch(`${API_BASE_URL}/agreements`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        // Dismiss uploading toast
        toast.dismiss(uploadToastId);

        if (response.ok) {
          const newAgreement = await response.json();
          setAgreements((prev) => [...prev, newAgreement]);

          // Enhanced success toast with analysis summary
          let message = `${file.name} analyzed as ${newAgreement.agreement_type}`;
          if (newAgreement.red_flag_count > 0) {
            message += ` - ${newAgreement.red_flag_count} red flag${newAgreement.red_flag_count !== 1 ? 's' : ''} detected`;
          }
          if (newAgreement.overall_rating) {
            message += ` (${newAgreement.overall_rating.toLowerCase()})`;
          }

          toast.success(message, {
            autoClose: 5000,
          });
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Failed to upload file');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAgreement = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/agreements/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setAgreements((prev) => prev.filter((a) => a.id !== id));
        toast.info('Agreement deleted');
      } else {
        toast.error('Failed to delete agreement');
      }
    } catch (error) {
      console.error('Error deleting agreement:', error);
      toast.error('Failed to delete agreement');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getHealthBadgeConfig = (rating) => {
    if (!rating) return null;

    const configs = {
      FAVORABLE: {
        label: 'Favorable',
        color: '#10b981', // green
        bgColor: 'rgba(16, 185, 129, 0.1)',
        icon: '✓',
      },
      NEUTRAL: {
        label: 'Neutral',
        color: '#f59e0b', // yellow/amber
        bgColor: 'rgba(245, 158, 11, 0.1)',
        icon: '−',
      },
      UNFAVORABLE: {
        label: 'Unfavorable',
        color: '#ef4444', // red
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: '⚠',
      },
    };

    return configs[rating] || null;
  };

  const getRedFlagSeverityText = (agreement) => {
    const parts = [];
    if (agreement.critical_flags_count > 0) {
      parts.push(`${agreement.critical_flags_count} critical`);
    }
    if (agreement.high_flags_count > 0) {
      parts.push(`${agreement.high_flags_count} high`);
    }
    if (agreement.medium_flags_count > 0) {
      parts.push(`${agreement.medium_flags_count} medium`);
    }
    return parts.join(', ');
  };

  const getExtractionQualityBadge = (score) => {
    if (score === null || score === undefined) return null;
    if (score >= 70) {
      return { label: 'Good', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' };
    }
    if (score >= 50) {
      return { label: 'Moderate', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
    }
    return { label: 'Low', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
  };

  const getFilterCount = (filter) => {
    if (filter === 'All') return agreements.length;
    return agreements.filter((a) => a.agreement_type === filter.toLowerCase()).length;
  };

  const filteredAgreements = agreements.filter(
    (a) => activeFilter === 'All' || a.agreement_type === activeFilter.toLowerCase()
  );

  return (
    <div className="flex flex-col h-full">
      <Sidebar />
      <Helmet>
        <title>RD - Agreements</title>
      </Helmet>
      <div className={styles.container} style={{ marginLeft: 'var(--sidebar-width, 72px)' }}>
        {/* Breadcrumb */}
        <Breadcrumbs className={styles.breadcrumb}>
          <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
          <BreadcrumbItem>Agreements</BreadcrumbItem>
        </Breadcrumbs>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Agreement Manager</h1>
            <p className={styles.pageSubtitle}>Upload and organize all your music agreements in one place</p>
          </div>
          <div className={styles.uploadControls}>
            <div className={styles.extractionMethodWrapper}>
              <button
                className={styles.extractionToggle}
                onClick={() => setShowExtractionOptions(!showExtractionOptions)}
                title="Extraction method settings"
              >
                ⚙️ {EXTRACTION_METHODS.find((m) => m.value === extractionMethod)?.label || 'Auto'}
              </button>
              {showExtractionOptions && (
                <div className={styles.extractionDropdown}>
                  <div className={styles.extractionDropdownHeader}>Extraction Method</div>
                  {EXTRACTION_METHODS.map((method) => (
                    <label key={method.value} className={styles.extractionOption}>
                      <input
                        type="radio"
                        name="extractionMethod"
                        value={method.value}
                        checked={extractionMethod === method.value}
                        onChange={(e) => {
                          setExtractionMethod(e.target.value);
                          setShowExtractionOptions(false);
                        }}
                      />
                      <div className={styles.extractionOptionContent}>
                        <span className={styles.extractionOptionLabel}>{method.label}</span>
                        <span className={styles.extractionOptionDesc}>{method.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className={styles.uploadButton} onClick={handleUploadClick} disabled={uploading}>
              {uploading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <FaUpload size={14} />}
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Filter Section */}
        <div className={styles.filterSection}>
          <FaFilter size={14} className={styles.filterIcon} />
          <span className={styles.filterLabel}>Filter:</span>
          <div className={styles.filterChips}>
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter}
                className={`${styles.filterChip} ${activeFilter === filter ? styles.filterChipActive : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter} ({getFilterCount(filter)})
              </button>
            ))}
          </div>
        </div>

        {/* Agreements List / Empty State */}
        <div className={styles.listSection}>
          {loading ? (
            <div className={styles.emptyState}>
              <CircularProgress size={40} sx={{ color: 'var(--muted-text)' }} />
            </div>
          ) : agreements.length === 0 ? (
            <div className={styles.emptyState}>
              <IoDocumentText size={64} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No documents uploaded yet. Start by uploading your first agreement.</p>
            </div>
          ) : filteredAgreements.length === 0 ? (
            <div className={styles.emptyState}>
              <IoDocumentText size={64} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No agreements match the selected filter.</p>
            </div>
          ) : (
            <div className={styles.agreementsList}>
              {filteredAgreements.map((agreement) => {
                const healthConfig = getHealthBadgeConfig(agreement.overall_rating);
                const hasRedFlags = agreement.red_flag_count > 0;
                const extractionBadge = getExtractionQualityBadge(agreement.extraction_quality_score);

                return (
                  <div key={agreement.id} className={styles.agreementItem}>
                    <div className={styles.agreementIcon}>
                      <FaFileAlt size={20} />
                    </div>
                    <div className={styles.agreementInfo}>
                      <div className={styles.agreementName}>{agreement.original_filename}</div>
                      <div className={styles.agreementMeta}>
                        <span className={styles.agreementSize}>{formatFileSize(agreement.file_size)}</span>
                        {healthConfig && (
                          <>
                            <span className={styles.metaDivider}>•</span>
                            <span className={styles.agreementRating}>{healthConfig.label}</span>
                          </>
                        )}
                        {hasRedFlags && (
                          <>
                            <span className={styles.metaDivider}>•</span>
                            <span className={styles.redFlagCount}>
                              {agreement.red_flag_count} red flag{agreement.red_flag_count !== 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                        {extractionBadge && agreement.extraction_quality_score < 70 && (
                          <>
                            <span className={styles.metaDivider}>•</span>
                            <span
                              style={{
                                color: extractionBadge.color,
                                fontSize: '11px',
                                padding: '2px 6px',
                                background: extractionBadge.bgColor,
                                borderRadius: '4px',
                              }}
                              title={`Extraction quality: ${agreement.extraction_quality_score}/100 (${agreement.extraction_method || 'unknown'})`}
                            >
                              ⚠️ {extractionBadge.label} extraction
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Health Badge */}
                    {healthConfig && (
                      <div
                        className={styles.healthBadge}
                        style={{
                          backgroundColor: healthConfig.bgColor,
                          color: healthConfig.color,
                          border: `1px solid ${healthConfig.color}40`,
                        }}
                      >
                        <span className={styles.healthIcon}>{healthConfig.icon}</span>
                        <span>{healthConfig.label}</span>
                      </div>
                    )}

                    {/* Red Flag Indicator */}
                    {hasRedFlags && (
                      <div className={styles.redFlagBadge} title={getRedFlagSeverityText(agreement)}>
                        <span className={styles.redFlagIcon}>⚠</span>
                        <span>{agreement.red_flag_count}</span>
                      </div>
                    )}

                    <span className={styles.agreementTypeBadge}>{agreement.agreement_type}</span>
                    <button
                      className={styles.viewButton}
                      onClick={() => navigate(`/agreements/${agreement.id}`)}
                      title="View agreement"
                    >
                      View
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteAgreement(agreement.id)}
                      title="Delete agreement"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Agreements;
