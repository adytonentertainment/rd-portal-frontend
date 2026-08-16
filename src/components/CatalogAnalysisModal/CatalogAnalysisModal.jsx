import React, { useState } from 'react';
import styles from './CatalogAnalysisModal.module.css';

const CatalogAnalysisModal = ({ isOpen, onClose, userCatalogData, userInfo }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    hasPRO: null,
    selectedPROs: [],
    proIPIs: {}, // Store IPI numbers for each PRO
    otherPRO: '',
    hasPublisher: null,
    producerAgreements: null,
    songsWithAgreements: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const proOptions = [
    'BMI',
    'ASCAP',
    'SESAC',
    'PRS (UK)',
    'SOCAN (Canada)',
    'APRA AMCOS (Australia)',
    'GEMA (Germany)',
  ];

  const handlePROAnswer = (answer) => {
    setFormData({ ...formData, hasPRO: answer });
    if (answer) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };

  const handlePROCheckbox = (pro) => {
    const selected = formData.selectedPROs.includes(pro)
      ? formData.selectedPROs.filter((p) => p !== pro)
      : [...formData.selectedPROs, pro];

    // If unchecking, remove the IPI for that PRO
    const newIPIs = { ...formData.proIPIs };
    if (!selected.includes(pro) && newIPIs[pro]) {
      delete newIPIs[pro];
    }

    setFormData({ ...formData, selectedPROs: selected, proIPIs: newIPIs });
  };

  const handleIPIChange = (pro, ipi) => {
    setFormData({
      ...formData,
      proIPIs: {
        ...formData.proIPIs,
        [pro]: ipi,
      },
    });
  };

  const handlePublisherAnswer = (answer) => {
    setFormData({ ...formData, hasPublisher: answer });
    setCurrentStep(4);
  };

  const handleProducerAgreements = (answer) => {
    setFormData({ ...formData, producerAgreements: answer });
    if (answer === 'some') {
      setCurrentStep(5); // Go to song selection
    } else {
      setCurrentStep(6); // Go to confirmation/warning step
    }
  };

  const handleSongSelection = (songId) => {
    const selected = formData.songsWithAgreements.includes(songId)
      ? formData.songsWithAgreements.filter((id) => id !== songId)
      : [...formData.songsWithAgreements, songId];
    setFormData({ ...formData, songsWithAgreements: selected });
  };

  const handleSongSelectionContinue = () => {
    setCurrentStep(6); // Go to confirmation/warning step
  };

  const handleConfirmSubmit = () => {
    handleSubmit(formData.producerAgreements);
  };

  const formatCatalogData = (catalog) => {
    if (!catalog || catalog.length === 0) {
      return 'No catalog data available';
    }

    let formatted = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formatted += `CATALOG SUMMARY (${catalog.length} tracks)\n`;
    formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalPublishingRevenue = 0;
    let totalMasterRevenue = 0;
    let totalStreams = 0;

    catalog.forEach((track, index) => {
      const publishingOwnership = (track.publishing_royalty * 100).toFixed(1);
      const masterOwnership = (track.master_royalty * 100).toFixed(1);
      const streams = track.songstats?.total_streams || track.playcount || 0;
      const spotifyStreams = track.songstats?.spotify_streams || 0;
      const youtubeStreams = track.songstats?.youtube_streams || 0;

      // Calculate revenue per stream rates (industry standard)
      const publishingRate = 0.0009; // $0.0009 per stream
      const masterRate = 0.004; // $0.004 per stream

      const publishingRevenue = streams * publishingRate * track.publishing_royalty;
      const masterRevenue = streams * masterRate * track.master_royalty;
      const totalRevenue = publishingRevenue + masterRevenue;

      totalPublishingRevenue += publishingRevenue;
      totalMasterRevenue += masterRevenue;
      totalStreams += streams;

      formatted += `${index + 1}. "${track.title}" by ${track.artist}\n`;
      formatted += `   ISRC: ${track.isrc || 'N/A'}\n`;
      formatted += `   Spotify ID: ${track.spotify_track_id || 'N/A'}\n`;
      formatted += `   \n`;
      formatted += `   OWNERSHIP:\n`;
      formatted += `   • Publishing: ${publishingOwnership}%\n`;
      formatted += `   • Master: ${masterOwnership}%\n`;
      formatted += `   \n`;
      formatted += `   STREAMS:\n`;
      formatted += `   • Total: ${streams.toLocaleString()}\n`;
      formatted += `   • Spotify: ${spotifyStreams.toLocaleString()}\n`;
      formatted += `   • YouTube: ${youtubeStreams.toLocaleString()}\n`;
      formatted += `   \n`;
      formatted += `   ESTIMATED REVENUE:\n`;
      formatted += `   • Publishing: $${publishingRevenue.toFixed(2)}\n`;
      formatted += `   • Master: $${masterRevenue.toFixed(2)}\n`;
      formatted += `   • Total: $${totalRevenue.toFixed(2)}\n`;
      formatted += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    });

    formatted += `TOTAL CATALOG SUMMARY:\n`;
    formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formatted += `Total Tracks: ${catalog.length}\n`;
    formatted += `Total Streams: ${totalStreams.toLocaleString()}\n`;
    formatted += `\n`;
    formatted += `ESTIMATED TOTAL REVENUE:\n`;
    formatted += `• Publishing Revenue: $${totalPublishingRevenue.toFixed(2)}\n`;
    formatted += `• Master Revenue: $${totalMasterRevenue.toFixed(2)}\n`;
    formatted += `• TOTAL: $${(totalPublishingRevenue + totalMasterRevenue).toFixed(2)}\n`;
    formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    return formatted;
  };

  const handleSubmit = async (producerAgreementsAnswer) => {
    setIsSubmitting(true);

    // Show success screen immediately (step 7)
    setCurrentStep(7);

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

    const submissionData = {
      // User Information
      username: userInfo?.username || 'Unknown',
      email: userInfo?.email || 'No email provided',
      userId: userInfo?.id || 'Unknown',

      // Form Responses
      hasPRO: formData.hasPRO ? 'Yes' : 'No',
      selectedPROs: formData.selectedPROs.join(', ') || 'None',
      proIPIs:
        Object.entries(formData.proIPIs)
          .map(([pro, ipi]) => `${pro}: ${ipi || 'Not provided'}`)
          .join(', ') || 'None',
      otherPRO: formData.otherPRO || 'N/A',
      hasPublisher: formData.hasPublisher || 'Not answered',
      producerAgreements: producerAgreementsAnswer,
      songsWithAgreements:
        producerAgreementsAnswer === 'some'
          ? formData.songsWithAgreements
              .map((id) => {
                const song = userCatalogData?.find((s) => s.id === id);
                return song ? `${song.title} by ${song.artist}` : null;
              })
              .filter(Boolean)
              .join(', ')
          : 'N/A',

      // Catalog Data (formatted)
      totalTracks: userCatalogData?.length || 0,
      catalogDetails: formatCatalogData(userCatalogData),

      // Metadata
      timestamp: new Date().toISOString(),
    };

    // Submit in background
    try {
      const payload = {
        subject: 'New Catalog Analysis Request - TuneMGMT',
        name: userInfo?.username || 'TuneMGMT User',
        email: userInfo?.email || 'noreply@tunescan.app',
        _replyto: userInfo?.email || 'noreply@tunescan.app',
        ...submissionData,
      };

      console.log('Submitting to Formspree with user:', userInfo?.username);
      console.log('📊 Catalog data length:', userCatalogData?.length);
      console.log('📊 Total tracks being sent:', submissionData.totalTracks);
      console.log('📊 Catalog details size:', submissionData.catalogDetails?.length, 'characters');
      console.log('📊 Catalog details preview (first 200 chars):', submissionData.catalogDetails?.substring(0, 200));
      console.log('📦 Full payload keys:', Object.keys(payload));
      console.log('📦 Has catalogDetails?', 'catalogDetails' in payload);
      console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');

      const response = await fetch('https://formspree.io/f/manpgjnp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      const result = await response.json();
      console.log('📨 Formspree response:', result);

      if (result.ok) {
        console.log('✅ Form submitted successfully to Formspree');
      } else {
        console.error('❌ Formspree submission failed:', result);
        console.error('❌ Error message:', result.errors);
      }
    } catch (error) {
      console.error('❌ Form submission error:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }

    // Auto-close after 4 seconds
    setTimeout(() => {
      handleClose();
    }, 4000);
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      hasPRO: null,
      selectedPROs: [],
      proIPIs: {},
      otherPRO: '',
      hasPublisher: null,
      producerAgreements: null,
      songsWithAgreements: [],
    });
    setIsSubmitting(false);
    onClose();
  };

  const renderProgressIndicator = () => {
    // Determine total steps: 7 if 'some' selected (includes song selection), 6 otherwise
    const totalSteps = formData.producerAgreements === 'some' ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
    return (
      <div className={styles.progressIndicator}>
        {totalSteps.map((step, index) => (
          <React.Fragment key={step}>
            <div className={`${styles.progressDot} ${currentStep >= step ? styles.progressDotActive : ''}`}>
              {currentStep >= step ? '●' : '○'}
            </div>
            {index < totalSteps.length - 1 && <div className={styles.progressLine}>━━</div>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <button className={styles.closeBtn} onClick={handleClose}>
          ×
        </button>

        <div className={styles.screen}>
          {renderProgressIndicator()}

          {/* Step 1: PRO Membership */}
          {currentStep === 1 && (
            <>
              <h2>Catalog Analysis</h2>
              <div className={styles.question}>
                <div className={styles.questionText}>Are you registered with a PRO?</div>
                <div className={styles.questionSubtitle}>(e.g., BMI, ASCAP, SESAC, PRS, SOCAN, APRA)</div>
              </div>

              <div className={styles.buttonGroup}>
                <button className={styles.btn} onClick={() => handlePROAnswer(true)}>
                  Yes
                </button>
                <button className={styles.btn} onClick={() => handlePROAnswer(false)}>
                  No
                </button>
              </div>
            </>
          )}

          {/* Step 2: PRO Selection */}
          {currentStep === 2 && (
            <>
              <h2>PRO Selection</h2>
              <div className={styles.question}>
                <div className={styles.questionText}>Which PRO(s) are you registered with?</div>
              </div>

              <div className={styles.checkboxGroup}>
                {proOptions.map((pro) => (
                  <div key={pro} className={styles.checkboxItem}>
                    <div className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        id={pro}
                        checked={formData.selectedPROs.includes(pro)}
                        onChange={() => handlePROCheckbox(pro)}
                      />
                      <label htmlFor={pro}>{pro}</label>
                    </div>
                    {formData.selectedPROs.includes(pro) && (
                      <input
                        type="text"
                        className={styles.ipiInput}
                        value={formData.proIPIs[pro] || ''}
                        onChange={(e) => handleIPIChange(pro, e.target.value)}
                        placeholder="Enter IPI (optional)"
                      />
                    )}
                  </div>
                ))}
                <div className={styles.checkboxItem}>
                  <div className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      id="other"
                      checked={formData.selectedPROs.includes('Other')}
                      onChange={() => handlePROCheckbox('Other')}
                    />
                    <label htmlFor="other">Other:</label>
                  </div>
                  {formData.selectedPROs.includes('Other') && (
                    <>
                      <input
                        type="text"
                        className={styles.otherInput}
                        value={formData.otherPRO}
                        onChange={(e) => setFormData({ ...formData, otherPRO: e.target.value })}
                        placeholder="Specify PRO"
                      />
                      <input
                        type="text"
                        className={styles.ipiInput}
                        value={formData.proIPIs.Other || ''}
                        onChange={(e) => handleIPIChange('Other', e.target.value)}
                        placeholder="Enter IPI (optional)"
                      />
                    </>
                  )}
                </div>
              </div>

              <button
                className={styles.btn}
                onClick={() => setCurrentStep(3)}
                disabled={formData.selectedPROs.length === 0}
              >
                Continue
              </button>
            </>
          )}

          {/* Step 3: Publisher/Publishing Admin */}
          {currentStep === 3 && (
            <>
              <h2>Publisher / Publishing Admin</h2>
              <div className={styles.question}>
                <div className={styles.questionText}>Do you have a publisher/publishing admin?</div>
              </div>

              <div className={styles.buttonGroupVertical}>
                <button className={styles.btn} onClick={() => handlePublisherAnswer('yes')}>
                  Yes
                </button>
                <button className={styles.btn} onClick={() => handlePublisherAnswer('no')}>
                  No
                </button>
                <button className={styles.btn} onClick={() => handlePublisherAnswer('i-dont-know')}>
                  I don't know
                </button>
              </div>
            </>
          )}

          {/* Step 4: Producer Agreements */}
          {currentStep === 4 && (
            <>
              <h2>Producer Agreements</h2>
              <div className={styles.question}>
                <div className={styles.questionText}>Do you have producer agreements for all your songs?</div>
              </div>

              <div className={styles.buttonGroupVertical}>
                <button className={styles.btn} onClick={() => handleProducerAgreements('yes')} disabled={isSubmitting}>
                  Yes
                </button>
                <button className={styles.btn} onClick={() => handleProducerAgreements('some')} disabled={isSubmitting}>
                  Some
                </button>
                <button className={styles.btn} onClick={() => handleProducerAgreements('no')} disabled={isSubmitting}>
                  No
                </button>
              </div>
            </>
          )}

          {/* Step 5: Song Selection (only if 'some' was selected) */}
          {currentStep === 5 && formData.producerAgreements === 'some' && (
            <>
              <h2>Select Songs with Agreements</h2>
              <div className={styles.question}>
                <div className={styles.questionText}>Which songs have producer agreements?</div>
                <div className={styles.questionSubtitle}>Select all songs that have producer agreements in place</div>
              </div>

              <div className={styles.checkboxGroup}>
                {userCatalogData && userCatalogData.length > 0 ? (
                  userCatalogData.map((song) => (
                    <div key={song.id} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        id={`song-${song.id}`}
                        checked={formData.songsWithAgreements.includes(song.id)}
                        onChange={() => handleSongSelection(song.id)}
                      />
                      <label htmlFor={`song-${song.id}`}>
                        {song.title} by {song.artist}
                      </label>
                    </div>
                  ))
                ) : (
                  <div className={styles.questionSubtitle}>No songs in catalog</div>
                )}
              </div>

              <button
                className={styles.btn}
                onClick={handleSongSelectionContinue}
                disabled={isSubmitting || formData.songsWithAgreements.length === 0}
              >
                Continue
              </button>
            </>
          )}

          {/* Step 6: Ownership Accuracy Warning */}
          {currentStep === 6 && (
            <>
              <h2>Before You Submit</h2>
              <div className={styles.warningBox}>
                <div className={styles.warningIcon}>⚠️</div>
                <div className={styles.warningText}>
                  Please ensure you have accurately entered your Publishing and Master ownership percentages for all
                  tracks in your catalog.
                  <br />
                  <br />
                  Accurate ownership splits are essential for precise revenue calculations and analysis.
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <button className={styles.btnSecondary} onClick={() => setCurrentStep(1)}>
                  Go Back
                </button>
                <button className={styles.btn} onClick={handleConfirmSubmit} disabled={isSubmitting}>
                  Confirm & Submit
                </button>
              </div>
            </>
          )}

          {/* Step 7: Success Message */}
          {currentStep === 7 && (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successText}>
                Thanks for submitting!
                <br />
                <br />
                Our team will review the information provided and give you a detailed report of potential lost revenue.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogAnalysisModal;
