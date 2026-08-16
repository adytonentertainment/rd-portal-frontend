import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import NavBar from '../../components/NavBar/NavBar';
import Footer from '../../components/Footer/Footer';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import Threads from '../../components/Threads/Threads';
import { CircularProgress } from '@mui/material';
import { IoCheckmarkCircle, IoDocumentText, IoArrowBack, IoArrowForward } from 'react-icons/io5';
import styles from './publishingadmin.module.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const AGREEMENT_TYPES = [
  {
    value: '3month',
    label: '30-Day Rolling Administration',
    description: '30-day term that auto-renews. Either party can terminate with 15-day notice.',
    recommended: true,
    details: [
      '20% administration fee',
      'No collection period after termination',
      '30-day rolling auto-renew',
      'You keep 100% ownership',
    ],
  },
  {
    value: '2year',
    label: '2-Year Administration',
    description: '2-year initial term with annual auto-renewal. Either party can terminate with 60-day notice.',
    recommended: false,
    details: [
      '20% administration fee',
      'No collection period after termination',
      'Annual auto-renewal after initial term',
      'You keep 100% ownership',
    ],
  },
];

const PublishingAdmin = () => {
  const [searchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    legalName: '',
    producerName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    termType: '3month',
  });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [signingComplete, setSigningComplete] = useState(false);

  // Handle return from DocuSign
  useEffect(() => {
    const event = searchParams.get('event');
    if (event === 'signing_complete') {
      setSigningComplete(true);
    }
  }, [searchParams]);

  const handleInput = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validateStep2 = () => {
    if (!form.legalName.trim()) return 'Please enter your legal name.';
    if (!form.producerName.trim()) return 'Please enter your producer/artist name.';
    if (!isValidEmail(form.email)) return 'Please enter a valid email address.';
    if (!form.address.trim()) return 'Please enter your street address.';
    if (!form.city.trim()) return 'Please enter your city.';
    if (!form.state.trim()) return 'Please enter your state/province.';
    if (!form.zip.trim()) return 'Please enter your ZIP/postal code.';
    if (!form.country.trim()) return 'Please enter your country.';
    return null;
  };

  const handleNext = () => {
    if (step === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
    }
    setErrorMsg('');
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setStatus('sending');
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/publishing-admin/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Something went wrong.');
      }

      const data = await response.json();

      // Redirect to DocuSign embedded signing
      if (data.signing_url) {
        window.location.href = data.signing_url;
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setStep(1);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleCloseModal = () => {
    if (status === 'sending') return;
    setShowModal(false);
    setStep(1);
    setStatus('idle');
    setErrorMsg('');
  };

  const selectedAgreement = AGREEMENT_TYPES.find((a) => a.value === form.termType);

  return (
    <>
      <Helmet>
        <title>RD - Publishing Administration</title>
        <meta
          name="description"
          content="Publishing administration without the lock-in. RD handles registrations, royalty collection, and catalog management with a 3-month minimum, no collection period, and a flat 20% fee."
        />
      </Helmet>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -5,
        }}
      >
        <Threads amplitude={1} distance={0} enableMouseInteraction={true} />
      </div>

      <NavBar />

      {/* DocuSign return success banner */}
      {signingComplete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            background: '#22c55e',
            color: '#fff',
            padding: '1rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <IoCheckmarkCircle size={20} />
          Your agreement has been signed successfully! You will receive a copy via email.
          <button
            onClick={() => setSigningComplete(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.25rem',
              cursor: 'pointer',
              marginLeft: '1rem',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      <div className={styles.container}>
        <div className={styles.hero}>
          <h1>Publishing Administration, Explained.</h1>
          <p className={styles.heroSub}>
            What it is, why it matters, and why most deals are designed to work against you.
          </p>
        </div>

        <div className={styles.content}>
          <h2>What is publishing administration?</h2>
          <p>
            You write songs. You produce beats. You own the rights to those compositions. But owning the rights and
            actually <em>collecting</em> the money from them are two very different things.
          </p>
          <p>
            Publishing administration is the process of registering your songs with collection societies and performance
            rights organizations around the world, then making sure every dollar owed to you actually gets collected and
            paid out. That means mechanical royalties from streaming, performance royalties from radio and live venues,
            sync fees from film and TV placements, and everything in between.
          </p>
          <p>
            Most independent songwriters and producers don't have the time, knowledge, or infrastructure to handle this
            themselves across dozens of global societies. That's where a publishing administrator comes in — they handle
            the paperwork, the registrations, the follow-ups, and the accounting so you can focus on making music.
          </p>

          <h2>The problem with standard admin deals</h2>
          <p>
            Publishing administration should be a straightforward service. You pay someone to collect your money. But
            the industry has turned it into something else entirely.
          </p>
          <p>Here's what a typical admin deal looks like:</p>

          <ul className={styles.problemList}>
            <li>
              <strong>3 to 5 year lock-in.</strong> You're committing to a company for years before you know if they're
              actually doing a good job. If they underperform, you're stuck.
            </li>
            <li>
              <strong>12+ month collection period after you leave.</strong> Even after the deal ends, they continue
              collecting your royalties — and taking their cut — for another year or more. You've left, but your money
              hasn't.
            </li>
            <li>
              <strong>Opaque accounting.</strong> Quarterly statements that are difficult to read, delayed payments, and
              little visibility into where your money is actually coming from.
            </li>
            <li>
              <strong>Fees up to 25%.</strong> Some administrators take a quarter of everything they collect, on top of
              the lock-in and collection period.
            </li>
          </ul>

          <p>
            These terms made sense when administration required physical offices in every territory and manual filings
            by mail. They don't make sense anymore.
          </p>

          <h2>How RD does it differently</h2>
          <p>
            We built our admin service around a simple idea: if we're doing a good job, you'll stay. We shouldn't need a
            contract to force it.
          </p>

          <div className={styles.highlightGrid}>
            <div className={styles.highlight}>
              <div className={styles.highlightLabel}>Minimum commitment</div>
              <div className={styles.highlightValue}>30 days</div>
              <p>
                Not 3 years. It rolls every 30 days. Either party can terminate with 15 days notice. No lock-in, no
                long-term commitment.
              </p>
            </div>

            <div className={styles.highlight}>
              <div className={styles.highlightLabel}>Collection period</div>
              <div className={styles.highlightValue}>None</div>
              <p>
                When you leave, we stop collecting. No 12-month tail where we keep taking a cut of your royalties after
                you've moved on.
              </p>
            </div>

            <div className={styles.highlight}>
              <div className={styles.highlightLabel}>Administration fee</div>
              <div className={styles.highlightValue}>20%</div>
              <p>
                Flat rate on royalties collected. You keep 80%. No hidden fees, no tiered pricing, no surprise
                deductions.
              </p>
            </div>

            <div className={styles.highlight}>
              <div className={styles.highlightLabel}>Copyright ownership</div>
              <div className={styles.highlightValue}>Yours. Always.</div>
              <p>
                We never take ownership of your songs. You grant us administration rights — the right to register and
                collect on your behalf. Your copyrights stay with you.
              </p>
            </div>
          </div>

          <h2>What's included</h2>
          <p>When you sign up for administration with RD, we handle:</p>

          <ul className={styles.includesList}>
            <li>Song registration with collection societies and royalty organizations worldwide</li>
            <li>Streaming royalty collection and registration</li>
            <li>Sync licensing opportunities — with your approval on every placement</li>
            <li>Quarterly transparent accounting with detailed breakdowns</li>
            <li>Royalty auditing and recovery of underpaid royalties</li>
            <li>Full catalog management and metadata maintenance</li>
          </ul>

          <h2>Who is this for?</h2>
          <p>
            Independent songwriters and producers who own their publishing and want professional administration without
            signing their life away. Whether you have 10 songs or 10,000 — if you want someone handling your
            registrations and collections without a multi-year commitment, this is built for you.
          </p>

          <div className={styles.ctaSection}>
            <h2>Ready to get started?</h2>
            <p>Set up your catalog with RD and start collecting what you're owed — on your terms.</p>
            <div className={styles.ctaButtons}>
              <FlatButton className="primary" onClick={handleOpenModal}>
                Get Started
              </FlatButton>
            </div>
          </div>
        </div>
      </div>

      {/* Signing Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: step === 3 ? '560px' : '480px' }}
          >
            <button className={styles.modalClose} onClick={handleCloseModal}>
              &times;
            </button>

            {/* Step indicator */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: s <= step ? 'var(--text)' : 'var(--border)',
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Step 1: Choose Agreement Type */}
            {step === 1 && (
              <>
                <h3>Choose your agreement</h3>
                <p className={styles.modalSub}>Select the administration term that works best for you.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {AGREEMENT_TYPES.map((type) => {
                    const isSelected = form.termType === type.value;
                    return (
                      <div
                        key={type.value}
                        onClick={() => handleInput('termType', type.value)}
                        style={{
                          padding: '1rem 1.25rem',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid var(--text)' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                      >
                        {type.recommended && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-0.5rem',
                              right: '1rem',
                              background: '#22c55e',
                              color: '#fff',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '0.125rem 0.5rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Recommended
                          </span>
                        )}
                        <div
                          style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}
                        >
                          {type.label}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--soft-text)',
                            lineHeight: 1.5,
                            marginBottom: '0.75rem',
                          }}
                        >
                          {type.description}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {type.details.map((detail, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.6875rem',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '100px',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--soft-text)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {detail}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  className={styles.submitBtn}
                  onClick={handleNext}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  Continue
                  <IoArrowForward size={16} />
                </button>
              </>
            )}

            {/* Step 2: Personal Information */}
            {step === 2 && (
              <>
                <h3>Your information</h3>
                <p className={styles.modalSub}>Enter your details exactly as they should appear on the agreement.</p>

                <div className={styles.formField}>
                  <label>Legal Full Name</label>
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => handleInput('legalName', e.target.value)}
                    placeholder="John Michael Smith"
                    disabled={status === 'sending'}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Producer / Artist Name</label>
                  <input
                    type="text"
                    value={form.producerName}
                    onChange={(e) => handleInput('producerName', e.target.value)}
                    placeholder="DJ Smith"
                    disabled={status === 'sending'}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleInput('email', e.target.value)}
                    placeholder="john@example.com"
                    disabled={status === 'sending'}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => handleInput('address', e.target.value)}
                    placeholder="123 Main St, Apt 4B"
                    disabled={status === 'sending'}
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleInput('city', e.target.value)}
                      placeholder="Los Angeles"
                      disabled={status === 'sending'}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label>State / Province</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => handleInput('state', e.target.value)}
                      placeholder="CA"
                      disabled={status === 'sending'}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>ZIP / Postal Code</label>
                    <input
                      type="text"
                      value={form.zip}
                      onChange={(e) => handleInput('zip', e.target.value)}
                      placeholder="90001"
                      disabled={status === 'sending'}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label>Country</label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => handleInput('country', e.target.value)}
                      placeholder="United States"
                      disabled={status === 'sending'}
                    />
                  </div>
                </div>

                {errorMsg && <p className={styles.modalError}>{errorMsg}</p>}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={handleBack}
                    style={{
                      flex: '0 0 auto',
                      padding: '0.875rem 1.25rem',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text)',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontFamily: 'var(--font-body, inherit)',
                    }}
                  >
                    <IoArrowBack size={16} />
                    Back
                  </button>
                  <button
                    className={styles.submitBtn}
                    onClick={handleNext}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    Review Agreement
                    <IoArrowForward size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Review & Sign */}
            {step === 3 && (
              <>
                <h3>Review & Sign</h3>
                <p className={styles.modalSub}>Please review your details before signing.</p>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <IoDocumentText size={20} style={{ color: 'var(--text)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9375rem' }}>
                      {selectedAgreement?.label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'Legal Name', value: form.legalName },
                      { label: 'Artist Name', value: form.producerName },
                      { label: 'Email', value: form.email },
                      { label: 'Address', value: `${form.address}, ${form.city}, ${form.state} ${form.zip}` },
                    ].map((item, i) => (
                      <div key={i} style={{ gridColumn: i === 3 ? '1 / -1' : undefined }}>
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: 'var(--soft-text)',
                            marginBottom: '0.2rem',
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text)', wordBreak: 'break-word' }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Terms */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.8125rem',
                    lineHeight: 1.6,
                    color: 'var(--soft-text)',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    Key Terms
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Administration Fee</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>20%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Initial Term</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                        {form.termType === '3month' ? '30 days' : '2 years'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Renewal</span>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                        {form.termType === '3month' ? '30-day rolling' : 'Annual'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Collection Period After Exit</span>
                      <span style={{ color: '#22c55e', fontWeight: 500 }}>None</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ownership Transfer</span>
                      <span style={{ color: '#22c55e', fontWeight: 500 }}>None</span>
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--soft-text)',
                    lineHeight: 1.5,
                    marginBottom: '1rem',
                  }}
                >
                  By clicking &ldquo;Sign Agreement&rdquo; you will be redirected to DocuSign to review and
                  electronically sign the Publishing Administration Agreement. A fully executed copy will be emailed to
                  you.
                </p>

                {errorMsg && <p className={styles.modalError}>{errorMsg}</p>}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleBack}
                    disabled={status === 'sending'}
                    style={{
                      flex: '0 0 auto',
                      padding: '0.875rem 1.25rem',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--text)',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontFamily: 'var(--font-body, inherit)',
                      opacity: status === 'sending' ? 0.4 : 1,
                    }}
                  >
                    <IoArrowBack size={16} />
                    Back
                  </button>
                  <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={status === 'sending'}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {status === 'sending' ? (
                      <>
                        <CircularProgress size={16} sx={{ color: 'var(--primary)' }} />
                        Preparing Agreement...
                      </>
                    ) : (
                      'Sign Agreement'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default PublishingAdmin;
