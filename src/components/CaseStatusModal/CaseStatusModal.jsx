import React, { useMemo, useContext } from 'react';
import { Modal, Box } from '@mui/material';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import './case-status-modal.module.css';

const CaseStatusModal = ({ isOpen, onClose, trackData }) => {
  const { currentTheme } = useContext(ThemeContext);
  const isDark = currentTheme === 'dark';
  // Determine current step based on case_status
  const getCurrentStep = () => {
    switch (trackData?.case_status) {
      case 'in_review':
        return 1;
      case 'in_the_works':
        return 2;
      case 'closed':
        return 3;
      default:
        return 1;
    }
  };

  const currentStep = useMemo(() => getCurrentStep(), [trackData?.case_status]);

  const steps = [
    {
      title: 'In Review',
      description:
        "Your case has been submitted and is currently being reviewed by our team. We'll investigate the details and determine the next steps.",
      color: '#F4E04D',
    },
    {
      title: 'In the Works',
      description:
        "We're actively working on your case. This may involve contacting platforms, rights holders, or gathering additional documentation.",
      color: '#10b981',
    },
    {
      title: 'Closed',
      description:
        'Your case has been resolved. Check your email for details about the outcome and any next steps you may need to take.',
      color: isDark ? '#fff' : '#000',
    },
  ];

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: isDark ? '#111' : '#fff',
          border: isDark ? '1px solid #333' : '1px solid #ddd',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              color: isDark ? '#fff' : '#000',
              fontSize: '24px',
              marginBottom: '8px',
            }}
          >
            Case Status
          </h2>
          <p style={{ color: isDark ? '#999' : '#666', fontSize: '14px' }}>
            {trackData?.title} - {trackData?.artist}
          </p>
        </div>

        {/* Read-only stepper display */}
        <div style={{ padding: '20px 0' }}>
          {/* Step indicators */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '30px',
            }}
          >
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isComplete = stepNumber < currentStep;
              const isNotLastStep = index < steps.length - 1;

              return (
                <React.Fragment key={stepNumber}>
                  {/* Step circle */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isActive || isComplete ? '#5227FF' : isDark ? '#222' : '#e5e5e5',
                      color: isActive || isComplete ? '#fff' : isDark ? '#a3a3a3' : '#666',
                      fontWeight: 600,
                      fontSize: '16px',
                      flexShrink: 0,
                    }}
                  >
                    {isComplete ? (
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#fff',
                        }}
                      />
                    ) : (
                      stepNumber
                    )}
                  </div>

                  {/* Connector line */}
                  {isNotLastStep && (
                    <div
                      style={{
                        flex: 1,
                        height: '2px',
                        background: isDark ? '#222' : '#e5e5e5',
                        margin: '0 10px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: isComplete ? '100%' : '0%',
                          background: '#5227FF',
                          transition: 'width 0.4s',
                        }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Current step content */}
          <div style={{ padding: '20px', color: isDark ? '#fff' : '#000' }}>
            <h3
              style={{
                fontSize: '18px',
                marginBottom: '12px',
                color: steps[currentStep - 1].color,
              }}
            >
              {steps[currentStep - 1].title}
            </h3>
            <p style={{ color: isDark ? '#999' : '#666', lineHeight: '1.6' }}>{steps[currentStep - 1].description}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '20px',
            padding: '10px 24px',
            background: '#5227FF',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Close
        </button>
      </Box>
    </Modal>
  );
};

export default CaseStatusModal;
