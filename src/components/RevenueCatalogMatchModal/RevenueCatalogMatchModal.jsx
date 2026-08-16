import React from 'react';
import styles from './RevenueCatalogMatchModal.module.css';

const RevenueCatalogMatchModal = ({ isOpen, onClose, analysisData, onAddToCatalog }) => {
  if (!isOpen || !analysisData) return null;

  const { found, notFound, totalRevenue, totalSongs } = analysisData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleAddSong = (song) => {
    // Navigate to catalog page with pre-filled data
    if (onAddToCatalog) {
      onAddToCatalog(song);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Revenue Songs Analysis</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Total Songs</div>
            <div className={styles.summaryValue}>{totalSongs}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>In Catalog</div>
            <div className={styles.summaryValue}>{found.length}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Not In Catalog</div>
            <div className={styles.summaryValue}>{notFound.length}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Total Revenue</div>
            <div className={styles.summaryValue}>{formatCurrency(totalRevenue)}</div>
          </div>
        </div>

        <div className={styles.content}>
          {/* Songs already in catalog */}
          {found.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>✓ Songs Already in Catalog ({found.length})</h3>
              <div className={styles.songList}>
                {found.map((song, index) => (
                  <div key={index} className={styles.songCard}>
                    <div className={styles.songHeader}>
                      <div className={styles.songTitle}>{song.songTitle}</div>
                      <div className={styles.songRevenue}>{formatCurrency(song.totalRevenue)}</div>
                    </div>
                    <div className={styles.songDetails}>
                      <div className={styles.songArtist}>{song.artist}</div>
                      <div className={styles.songIsrc}>ISRC: {song.isrc}</div>
                    </div>
                    <div className={styles.songStats}>
                      <span className={styles.statBadge}>{song.transactionCount} transactions</span>
                      <span className={styles.statBadge}>In Catalog</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Songs NOT in catalog */}
          {notFound.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>+ Songs Not in Catalog ({notFound.length})</h3>
              <div className={styles.songList}>
                {notFound.map((song, index) => (
                  <div key={index} className={styles.songCard}>
                    <div className={styles.songHeader}>
                      <div className={styles.songTitle}>{song.songTitle}</div>
                      <div className={styles.songRevenue}>{formatCurrency(song.totalRevenue)}</div>
                    </div>
                    <div className={styles.songDetails}>
                      <div className={styles.songArtist}>{song.artist}</div>
                      <div className={styles.songIsrc}>ISRC: {song.isrc}</div>
                    </div>
                    <div className={styles.songStats}>
                      <span className={styles.statBadge}>{song.transactionCount} transactions</span>
                      <button className={styles.addBtn} onClick={() => handleAddSong(song)}>
                        Add to Catalog
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalSongs === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <div className={styles.emptyText}>
                No songs with ISRC found in revenue data.
                <br />
                Upload statements with ISRC codes to see analysis.
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevenueCatalogMatchModal;
