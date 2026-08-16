import React, { useRef, useState } from 'react';
import NavBar from '../../components/NavBar/NavBar';
import ReCAPTCHA from 'react-google-recaptcha';
import { Helmet } from 'react-helmet-async';

const RequestDemo = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    catalogSize: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const recaptchaRef = useRef();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      let token = null;
      try {
        token = await recaptchaRef.current.executeAsync();
        recaptchaRef.current.reset();
      } catch (err) {
        console.warn('[RequestDemo] reCAPTCHA failed:', err);
      }

      const payload = {
        name: formData.name,
        _replyto: formData.email,
        email: formData.email,
        company: formData.company,
        catalogSize: formData.catalogSize,
        message: formData.message,
        _subject: `RD Demo Request from ${formData.name}`,
      };
      if (token) payload['g-recaptcha-response'] = token;

      const response = await fetch('https://formspree.io/f/myznqnnn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', company: '', catalogSize: '', message: '' });
      } else {
        console.error('[RequestDemo] Formspree error:', response.status);
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('[RequestDemo] Submit error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--input-bg, rgba(255, 255, 255, 0.05))',
    border: '2px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '16px',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
  };

  return (
    <>
      <Helmet>
        <title>RD - Request a Demo</title>
        <meta name="description" content="Request a demo of the RD platform." />
      </Helmet>
      <NavBar />
      <div style={{ minHeight: 'calc(100vh - 80px)', padding: '60px 20px', background: 'var(--background)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            Request a Demo
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '32px' }}>
            We'll walk you through the platform.
          </p>

          <div
            style={{
              background: 'var(--panel-bg)',
              border: '2px solid var(--border)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '4px 4px 0px var(--border)',
            }}
          >
            {submitStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  Request received.
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '20px' }}>
                  We'll be in touch soon.
                </p>
                <button
                  onClick={() => setSubmitStatus(null)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Submit Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle} htmlFor="name">
                    Name *
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle} htmlFor="email">
                    Email *
                  </label>
                  <input
                    style={inputStyle}
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle} htmlFor="company">
                    Company / Label
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle} htmlFor="catalogSize">
                    Catalog Size
                  </label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    id="catalogSize"
                    name="catalogSize"
                    value={formData.catalogSize}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option value="1-100">1 - 100 tracks</option>
                    <option value="101-500">101 - 500 tracks</option>
                    <option value="501-1000">501 - 1,000 tracks</option>
                    <option value="1001-5000">1,001 - 5,000 tracks</option>
                    <option value="5001-10000">5,001 - 10,000 tracks</option>
                    <option value="10001+">10,001+ tracks</option>
                  </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle} htmlFor="message">
                    Anything else?
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                  />
                </div>

                {submitStatus === 'error' && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: 'rgb(239, 68, 68)',
                      fontSize: '14px',
                      marginBottom: '16px',
                    }}
                  >
                    Something went wrong. Please try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    background: 'var(--text)',
                    border: '2px solid var(--text)',
                    borderRadius: '8px',
                    color: 'var(--background)',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Sending...' : 'Get Free Audit'}
                </button>
              </form>
            )}

            <ReCAPTCHA ref={recaptchaRef} sitekey="6LflXwwrAAAAAJunzDZUUNsXHOU8-IeQ3nFujKeF" size="invisible" />
          </div>
        </div>
      </div>
    </>
  );
};

export default RequestDemo;
