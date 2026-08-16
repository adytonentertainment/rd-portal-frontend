import React, { useState, useEffect } from 'react';
import styles from './claim-royalties-modal.module.css';

const ClaimRoyaltiesModal = ({ isOpen, onClose, trackData, onCaseFiled }) => {
  const [currentScreen, setCurrentScreen] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({
    noAgreement: false,
    claimPub: false,
    claimMaster: false,
  });
  const [pubSplit, setPubSplit] = useState(25);
  const [masterSplit, setMasterSplit] = useState(15);

  // Update splits when trackData changes
  useEffect(() => {
    if (trackData) {
      setPubSplit(trackData.publishing_royalty ? Math.round(trackData.publishing_royalty * 100) : 25);
      setMasterSplit(trackData.master_royalty ? Math.round(trackData.master_royalty * 100) : 15);
    }
  }, [trackData]);

  if (!isOpen) return null;

  const hasSelection = Object.values(selectedOptions).some((val) => val);

  const handleCheckboxChange = (option) => {
    setSelectedOptions({
      ...selectedOptions,
      [option]: !selectedOptions[option],
    });
  };

  const goToScreen2 = () => {
    setCurrentScreen(2);
  };

  const handleFileCase = async () => {
    // Get user info from JWT token
    let userEmail = 'unknown@verax.app';
    let username = '';
    let userId = '';
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userEmail = payload.email || userEmail;
        username = payload.sub || '';
        userId = payload.id || '';
      }
    } catch (e) {
      console.error('Failed to decode token for email:', e);
    }

    // Prepare the selected issues
    const selectedIssues = [];
    if (selectedOptions.noAgreement) selectedIssues.push('Beat/sample used - no agreement/clearance');
    if (selectedOptions.claimPub) selectedIssues.push('Claim publishing royalties');
    if (selectedOptions.claimMaster) selectedIssues.push('Claim master royalties');

    // Submit to Formspree
    try {
      const formspreeRes = await fetch('https://formspree.io/f/xgvpolwz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          username,
          user_id: userId,
          track_title: trackData?.title || 'Unknown',
          track_artist: trackData?.artist || 'Unknown',
          track_isrc: trackData?.isrc || 'N/A',
          spotify_track_id: trackData?.spotify_track_id || 'N/A',
          selected_issues: selectedIssues.join(', '),
          publishing_split: `${pubSplit}%`,
          master_split: `${masterSplit}%`,
          spotify_streams: trackData?.spotify_playcount || 0,
          youtube_views: trackData?.youtube_playcount || 0,
          estimated_total: calculateEstimate().total,
          estimated_publishing: calculateEstimate().pub,
          estimated_master: calculateEstimate().master,
          submission_date: new Date().toISOString(),
        }),
      });
      if (formspreeRes.ok) {
        console.log('✅ Case submitted to Formspree');
      } else {
        const errData = await formspreeRes.json().catch(() => ({}));
        console.error('❌ Formspree rejected submission:', formspreeRes.status, errData);
      }
    } catch (error) {
      console.error('❌ Failed to submit to Formspree:', error);
    }

    // Update case status in backend
    try {
      const token = localStorage.getItem('token');
      if (token && trackData?.id) {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/catalog/tracks/${trackData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            case_status: 'in_review',
          }),
        });

        if (!response.ok) {
          console.error('Failed to update case status:', response.statusText);
        }
      }
    } catch (error) {
      console.error('Error updating case status:', error);
    }

    // Refresh catalog data to show updated button state
    if (onCaseFiled) {
      onCaseFiled();
    }

    // Show success screen immediately
    setCurrentScreen(3);

    // Play notification sound
    try {
      const audio = new Audio('/notification-success.mp3');
      audio.volume = 0.5;
      audio.play().catch((error) => {
        console.log('Audio play failed:', error);
      });
    } catch (error) {
      console.log('Audio initialization failed:', error);
    }

    // Auto-close after 4 seconds
    setTimeout(() => {
      handleClose();
    }, 4000);
  };

  const handleClose = () => {
    setCurrentScreen(1);
    setSelectedOptions({
      noAgreement: false,
      claimPub: false,
      claimMaster: false,
    });
    // Reset to track's saved percentages
    setPubSplit(trackData?.publishing_royalty ? Math.round(trackData.publishing_royalty * 100) : 25);
    setMasterSplit(trackData?.master_royalty ? Math.round(trackData.master_royalty * 100) : 15);
    onClose();
  };

  const calculateEstimate = () => {
    // Platform-specific rates (per stream/view)
    const SPOTIFY_MASTER_RATE = 0.0038; // $3,800 per million
    const SPOTIFY_PUBLISHING_RATE = 0.001; // $1,000 per million
    const YOUTUBE_MASTER_RATE = 0.002; // $2,000 per million
    const YOUTUBE_PUBLISHING_RATE = 0.0004; // $400 per million

    // Use playcount from trackData (pulled from Play Count card)
    const spotifyStreams = trackData?.spotify_playcount || 0;
    const youtubeViews = trackData?.youtube_playcount || 0;

    if (spotifyStreams === 0 && youtubeViews === 0) {
      return {
        total: '$0',
        pub: '$0',
        master: '$0',
        showPub: selectedOptions.noAgreement || selectedOptions.claimPub,
        showMaster: selectedOptions.noAgreement || selectedOptions.claimMaster,
      };
    }

    // Calculate total revenue by platform
    const spotifyMasterRevenue = spotifyStreams * SPOTIFY_MASTER_RATE;
    const spotifyPubRevenue = spotifyStreams * SPOTIFY_PUBLISHING_RATE;
    const youtubeMasterRevenue = youtubeViews * YOUTUBE_MASTER_RATE;
    const youtubePubRevenue = youtubeViews * YOUTUBE_PUBLISHING_RATE;

    // Total revenues (using exact rates)
    const totalPubRevenue = spotifyPubRevenue + youtubePubRevenue;
    const totalMasterRevenue = spotifyMasterRevenue + youtubeMasterRevenue;

    // Calculate unclaimed amounts based on user's equity share
    const pubAmount = totalPubRevenue * (pubSplit / 100);
    const masterAmount = totalMasterRevenue * (masterSplit / 100);

    const showPub = selectedOptions.noAgreement || selectedOptions.claimPub;
    const showMaster = selectedOptions.noAgreement || selectedOptions.claimMaster;

    // Calculate total
    let total = 0;
    if (showPub) {
      total += pubAmount;
    }
    if (showMaster) {
      total += masterAmount;
    }

    const formatAmount = (amount) => {
      return `$${Math.round(amount).toLocaleString()}`;
    };

    return {
      total: formatAmount(total),
      pub: formatAmount(pubAmount),
      master: formatAmount(masterAmount),
      showPub,
      showMaster,
    };
  };

  const estimate = calculateEstimate();

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}>
          ×
        </button>

        {/* Screen 1: Status Check */}
        {currentScreen === 1 && (
          <div className={styles.screen}>
            <h2>What do you need help with?</h2>

            <div className={styles.trackDisplay}>
              <div className={styles.title}>{trackData?.title || 'Track'}</div>
              <div className={styles.artist}>{trackData?.artist || 'Artist'}</div>
            </div>

            <div className={styles.checkboxGroup}>
              <div className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  id="no-agreement"
                  checked={selectedOptions.noAgreement}
                  onChange={() => handleCheckboxChange('noAgreement')}
                />
                <label htmlFor="no-agreement">My beat/sample was used - no agreement/clearance</label>
              </div>
              <div className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  id="claim-pub"
                  checked={selectedOptions.claimPub}
                  onChange={() => handleCheckboxChange('claimPub')}
                />
                <label htmlFor="claim-pub">Claim publishing royalties</label>
              </div>
              <div className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  id="claim-master"
                  checked={selectedOptions.claimMaster}
                  onChange={() => handleCheckboxChange('claimMaster')}
                />
                <label htmlFor="claim-master">Claim master royalties</label>
              </div>
            </div>

            <button className={styles.btn} onClick={goToScreen2} disabled={!hasSelection}>
              Next
            </button>
          </div>
        )}

        {/* Screen 2: Diagnostics */}
        {currentScreen === 2 && (
          <div className={styles.screen}>
            <h2>Diagnostics</h2>

            <div className={styles.trackDisplay}>
              <div className={styles.title}>{trackData?.title || 'Track'}</div>
              <div className={styles.artist}>{trackData?.artist || 'Artist'}</div>
            </div>

            <div
              className={styles.splitsContainer}
              style={{
                gridTemplateColumns: estimate.showPub && estimate.showMaster ? '1fr 1fr' : '1fr',
              }}
            >
              {estimate.showPub && (
                <div className={styles.splitInput}>
                  <label>Publishing Split</label>
                  <div>
                    <input
                      type="number"
                      value={pubSplit}
                      min="0"
                      max="100"
                      onChange={(e) => setPubSplit(Number(e.target.value))}
                    />
                    <span>%</span>
                  </div>
                </div>
              )}
              {estimate.showMaster && (
                <div className={styles.splitInput}>
                  <label>Master Split</label>
                  <div>
                    <input
                      type="number"
                      value={masterSplit}
                      min="0"
                      max="100"
                      onChange={(e) => setMasterSplit(Number(e.target.value))}
                    />
                    <span>%</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.estimationBox}>
              <div className={styles.estimationLabel}>Estimated Unclaimed</div>
              <div className={styles.estimationAmount}>{estimate.total}</div>
              <div className={styles.breakdown}>
                {estimate.showPub && (
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownLabel}>Publishing</span>
                    <span>{estimate.pub}</span>
                  </div>
                )}
                {estimate.showMaster && (
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownLabel}>Master</span>
                    <span>{estimate.master}</span>
                  </div>
                )}
              </div>
            </div>

            <button className={styles.btn} onClick={handleFileCase}>
              File Case
            </button>
          </div>
        )}

        {/* Screen 3: Success */}
        {currentScreen === 3 && (
          <div className={styles.screen}>
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successText}>
                Thanks for filing the case with us!
                <br />
                <br />
                Our team will internally review it and get back to you within 48h.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimRoyaltiesModal;
