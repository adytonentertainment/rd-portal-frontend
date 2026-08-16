import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCrown, FaTimes } from 'react-icons/fa';
import styles from './upgrademodal.module.css';

const UpgradeModal = ({ isOpen, onClose, feature = 'this feature' }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  // Feature-specific content
  const getFeatureContent = () => {
    switch (feature) {
      case 'TuneScan':
        return {
          description:
            "Start recovering revenue from unauthorized usage. TuneScan finds where your beats and samples are being used without permission so you can claim what you're owed.",
          features: [
            'Recover lost revenue from unauthorized usage',
            'Find uncredited uses across multiple DSPs',
            'Automatic re-scan',
            'Get notified everytime our system detects usage',
          ],
        };
      case 'Revenue':
        return {
          description:
            "Stop leaving money on the table. Upload your royalty statements to audit your catalog for revenue leaks and find discrepancies so you can recover what you're owed.",
          features: [
            'Audit catalog for revenue leaks',
            'Find discrepancies in royalty statements',
            'Visualize source and territory of revenue',
            'Track earnings across all DSPs',
          ],
        };
      case 'Earnings Export':
        return {
          description:
            'Export your earnings data to share with your team, accountant, or legal counsel. Get customizable reports with detailed breakdowns of your revenue across all platforms and territories.',
          features: [
            'Export detailed earnings reports as CSV',
            'Customize reports by date range and filters',
            'Share data with accountants and legal teams',
            'Track historical earnings for tax purposes',
          ],
        };
      case 'Catalog Export':
        return {
          description:
            'Export your catalog data for Schedule A tax forms, copyright registration, or your own records. Get a complete list of all your tracks with metadata and rights information.',
          features: [
            'Export Schedule A-ready CSV files',
            'Include all track metadata and rights info',
            'Use for copyright registration',
            'Keep records for legal purposes',
          ],
        };
      default:
        return {
          description:
            "Unlock the full potential of RD. Track your revenue, audit for leaks, and recover what you're owed across all platforms.",
          features: [
            'Audit catalog for revenue leaks',
            'Find uncredited uses across DSPs',
            'Track earnings and discrepancies',
            'Get notified of all detections',
          ],
        };
    }
  };

  const content = getFeatureContent();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <FaTimes size={16} />
        </button>

        <div className={styles.iconWrapper}>
          <FaCrown size={32} className={styles.crownIcon} />
        </div>

        <h2 className={styles.title}>Upgrade to Access {feature}</h2>

        <p className={styles.description}>{content.description}</p>

        <div className={styles.features}>
          {content.features.map((item, index) => (
            <div key={index} className={styles.featureItem}>
              {item}
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.upgradeButton} onClick={handleUpgrade}>
            View Plans
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
