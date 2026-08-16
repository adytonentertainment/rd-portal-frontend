import React, { useRef, useState } from 'react';
import NavBar from '../../components/NavBar/NavBar';
import ReCAPTCHA from 'react-google-recaptcha';
import { Helmet } from 'react-helmet-async';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
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
        console.warn('[Contact] reCAPTCHA failed:', err);
      }

      const payload = {
        name: formData.name,
        _replyto: formData.email,
        email: formData.email,
        message: formData.message,
        _subject: `RD Contact from ${formData.name}`,
      };
      if (token) payload['g-recaptcha-response'] = token;

      const response = await fetch('https://formspree.io/f/myznqnnn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        console.error('[Contact] Formspree error:', response.status);
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('[Contact] Submit error:', error);
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
        <title>RD - Contact Us</title>
        <meta name="description" content="Get in touch with the RD team." />
      </Helmet>
      <NavBar />
      <div style={{ minHeight: 'calc(100vh - 80px)', padding: '60px 20px', background: 'var(--background)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Contact Us</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '32px' }}>
            Or email us at{' '}
            <a href="mailto:contact@verax.app" style={{ color: 'var(--text)', fontWeight: 600 }}>
              contact@verax.app
            </a>
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
                  Message sent.
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '20px' }}>
                  We'll get back to you soon.
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
                  Send Another
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

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle} htmlFor="message">
                    Message *
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
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
                    Something went wrong. Please try again or email us directly.
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
                  {isSubmitting ? 'Sending...' : 'Send'}
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

export default Contact;
