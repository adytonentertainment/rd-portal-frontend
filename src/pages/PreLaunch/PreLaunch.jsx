import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import NavBar from '../../components/NavBar/NavBar';
import styles from './prelaunch.module.css';
import FadeInAnimation from '../../components/FadeInAnimation';
import Particles from '../../components/Particles/Particles';
import CatalogDemo from '../../components/CatalogDemo/CatalogDemo';
import SpotlightCard from '../../components/SpotlightCard/SpotlightCard';
import { FaChartLine, FaDollarSign, FaGlobe, FaHandshake } from 'react-icons/fa6';
import { BsSoundwave } from 'react-icons/bs';
import { BiCheckShield } from 'react-icons/bi';
import { MdDashboard } from 'react-icons/md';
import Spacing from '../../components/Spacing';
import Footer from '../../components/Footer/Footer';

const PreLaunch = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(''); // 'success', 'error', 'loading'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('https://formspree.io/f/myznqnnn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email,
          _subject: 'Waitlist Signup',
          source: 'prelaunch',
        }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage("You're on the list! We'll notify you when we launch.");
        setEmail('');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to submit. Please try again later.');
    }
  };

  const serviceCards = [
    {
      icon: MdDashboard,
      title: 'Financial Dashboard',
      description:
        'Track royalties from streaming, sync, radio, and performance across all platforms. Monitor master and publishing revenue streams for producers, songwriters, and artists with real-time analytics and detailed breakdowns.',
    },
    {
      icon: FaChartLine,
      title: 'Streaming Analytics',
      description:
        'Monitor streaming performance across Spotify, YouTube, Apple Music, and more. Analyze trends, identify top performers, and make data-driven decisions to grow your catalog.',
    },
    {
      icon: BiCheckShield,
      title: 'PRO Registration Audit',
      description:
        'Complete audit of your catalog with performing rights organizations. Ensure proper registration and maximize royalty collection opportunities.',
    },
    {
      icon: FaDollarSign,
      title: 'Master Royalty Collection',
      description:
        'Recover unclaimed master royalties with professional legal support. Collect every dollar owed from streaming platforms and digital services.',
    },
    {
      icon: FaGlobe,
      title: 'Publishing Collection',
      description:
        'We work with trusted sub-publishers and partners globally to ensure leak-free, fast royalty collection. Maximize publishing revenue across international markets and collection societies worldwide.',
    },
    {
      icon: FaHandshake,
      title: 'Catalog Financing',
      description:
        'Get advances on catalog value with flexible financing options. Professional valuations and support for catalog sales and acquisitions.',
    },
    {
      icon: BsSoundwave,
      title: 'TuneScan (Discovery & Fingerprinting)',
      description:
        "Search and identify your tracks across Spotify, YouTube, and Apple Music. Our advanced audio fingerprinting scans the internet for unauthorized usage, identifying unlicensed music across platforms so you can claim what's rightfully yours.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>RD - Launching Soon</title>
        <meta
          name="description"
          content="Join the waitlist for RD - comprehensive catalog management for producers, songwriters, and rights administrators."
        />
      </Helmet>

      {/* Particles Background */}
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
        <Particles
          particleColors={['#ffffff']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        />
      </div>

      <NavBar hideCTA={true} />

      <div className="relative">
        <div className={`${styles.container} ${styles.containerCards}`}>
          <div className="flex min-h-screen flex-col justify-center items-center">
            <FadeInAnimation id="hero" className="text-center flex-grow flex items-center">
              <div className={`mx-auto max-w-5xl ${styles.heroCentered}`}>
                <div className={styles.launchBadge}>
                  <span className={styles.launchBadgeText}>Launching Soon</span>
                </div>
                <h1 className={styles.heroHeadline}>
                  <span className={styles.heroLine}>Catalog management infrastructure</span>
                  <span className={styles.heroLine}>for creators and rights holders.</span>
                </h1>
                <p className={styles.heroDescription}>
                  Track royalties across every platform. Audit PRO registrations. Analyze statements. Follow up on
                  recoupments. Scale from solo creator to enterprise. No contracts required.
                </p>
              </div>
            </FadeInAnimation>
          </div>
        </div>
      </div>

      <div className={`${styles.container} ${styles.containerCards}`}>
        <Spacing height="24px" className="md:hidden" />
        <Spacing height="80px" className="hidden md:block" />

        {/* Problem Cards Section */}
        <FadeInAnimation id="problems">
          <div className={styles.problemSection}>
            <h2>The money problem nobody talks about.</h2>

            <div className={styles.problemCardsWrapper}>
              <div className={styles.problemCardsGrid}>
                {/* Card 1: Recoupment Guesswork */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M13.7009 4.00034C13.8418 4.00054 13.9123 4.00064 13.9561 4.04456C14 4.08848 14 4.15902 14 4.3001V6.5C14 7.32843 14.6716 8 15.5 8C16.3284 8 17 7.32843 17 6.5V4.43252C17 4.27691 17 4.1991 17.0509 4.1543C17.1018 4.10951 17.1776 4.11922 17.3291 4.13864C18.4503 4.2824 19.2316 4.57539 19.8281 5.17188C20.9997 6.34345 21 8.22876 21 12C21 15.7712 20.9997 17.6566 19.8281 18.8281C18.6566 19.9997 16.7712 20 13 20H11C7.22876 20 5.34345 19.9997 4.17188 18.8281C3.0003 17.6566 3 15.7712 3 12C3 8.22876 3.0003 6.34345 4.17188 5.17188C4.76836 4.57539 5.54969 4.2824 6.67094 4.13864C6.82244 4.11922 6.89819 4.10951 6.94909 4.1543C7 4.1991 7 4.27691 7 4.43252V6.5C7 7.32843 7.67158 8 8.5 8C9.32843 8 10 7.32843 10 6.5V4.3001C10 4.15902 10 4.08848 10.0439 4.04456C10.0877 4.00064 10.1582 4.00054 10.2991 4.00034C10.5252 4.00002 10.7588 4 11 4H13C13.2412 4 13.4748 4.00002 13.7009 4.00034Z"
                        fill="#7E869E"
                        fillOpacity="0.25"
                      />
                      <path d="M8.5 2.5L8.5 6.5" stroke="#222222" strokeLinecap="round" />
                      <path d="M15.5 2.5L15.5 6.5" stroke="#222222" strokeLinecap="round" />
                      <circle cx="7.5" cy="10.5" r="0.5" fill="#222222" />
                      <circle cx="10.5" cy="10.5" r="0.5" fill="#222222" />
                      <circle cx="13.5" cy="10.5" r="0.5" fill="#222222" />
                      <circle cx="16.5" cy="10.5" r="0.5" fill="#222222" />
                      <circle cx="7.5" cy="13.5" r="0.5" fill="#222222" />
                      <circle cx="10.5" cy="13.5" r="0.5" fill="#222222" />
                      <circle cx="13.5" cy="13.5" r="0.5" fill="#222222" />
                      <circle cx="16.5" cy="13.5" r="0.5" fill="#222222" />
                      <circle cx="7.5" cy="16.5" r="0.5" fill="#222222" />
                      <circle cx="10.5" cy="16.5" r="0.5" fill="#222222" />
                      <circle cx="13.5" cy="16.5" r="0.5" fill="#222222" />
                      <circle cx="16.5" cy="16.5" r="0.5" fill="#222222" />

                      {/* Red question mark overlay - tilted */}
                      <g transform="translate(16, 14) rotate(12)">
                        <text
                          x="0"
                          y="0"
                          fontSize="12"
                          fontWeight="bold"
                          fill="#FF6B6B"
                          stroke="#2a2a2a"
                          strokeWidth="0.4"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          ?
                        </text>
                      </g>
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>When Did You Recoup?</h3>
                    <p className={styles.problemCardBody}>
                      Your label advance was $50K. You've earned... something. Profitable yet? Who knows.
                    </p>
                  </div>
                </div>

                {/* Card 2: Contract Review */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg viewBox="0 0 100 100" fill="none">
                      <rect x="20" y="15" width="60" height="70" stroke="#333" strokeWidth="2" rx="2" fill="white" />
                      <line x1="30" y1="30" x2="70" y2="30" stroke="#333" strokeWidth="1.5" />
                      <line x1="30" y1="40" x2="70" y2="40" stroke="#333" strokeWidth="1.5" />
                      <line x1="30" y1="50" x2="70" y2="50" stroke="#333" strokeWidth="1.5" />
                      <line x1="30" y1="60" x2="60" y2="60" stroke="#333" strokeWidth="1.5" />
                      <text x="50" y="75" fontSize="18" fill="#FF6B6B" textAnchor="middle" fontWeight="bold">
                        ?
                      </text>
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>What Did You Sign?</h3>
                    <p className={styles.problemCardBody}>
                      360 deal. Publishing split. Advance terms. You signed it. Do you understand it?
                    </p>
                  </div>
                </div>

                {/* Card 3: No Legal Representation */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg viewBox="0 0 100 100" fill="none">
                      <circle cx="35" cy="50" r="15" fill="#4A90E2" />
                      <rect x="45" y="45" width="30" height="10" fill="#4A90E2" transform="rotate(30 50 50)" />
                      <text x="35" y="55" fontSize="16" fill="white" textAnchor="middle" fontWeight="bold">
                        $
                      </text>
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>No Collection Strategy</h3>
                    <p className={styles.problemCardBody}>Reliant on expensive attorneys, delays occur.</p>
                  </div>
                </div>

                {/* Card 4: Revenue Black Box */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg viewBox="0 0 100 100" fill="none">
                      <rect x="15" y="25" width="70" height="45" stroke="#333" strokeWidth="2" rx="4" />
                      <rect x="20" y="30" width="60" height="35" fill="#f0f0f0" />
                      <rect x="40" y="70" width="20" height="5" fill="#333" />
                      <rect x="35" y="75" width="30" height="3" fill="#333" />
                      <text x="50" y="52" fontSize="24" fill="#FF6B6B" textAnchor="middle" fontWeight="bold">
                        ?
                      </text>
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>Revenue Per Source?</h3>
                    <p className={styles.problemCardBody}>
                      Spotify, Apple, YouTube, TikTok. How much came from each? Your guess is as good as theirs.
                    </p>
                  </div>
                </div>

                {/* Card 5: Registration Gaps */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg viewBox="0 0 100 100" fill="none">
                      <rect x="25" y="20" width="50" height="65" stroke="#333" strokeWidth="2" rx="2" />
                      <line x1="35" y1="35" x2="45" y2="35" stroke="#333" strokeWidth="2" />
                      <line x1="35" y1="45" x2="45" y2="45" stroke="#333" strokeWidth="2" />
                      <line x1="35" y1="55" x2="45" y2="55" stroke="#333" strokeWidth="2" />
                      <path d="M55 32 L63 40 M63 32 L55 40" stroke="#FF6B6B" strokeWidth="2" />
                      <path d="M55 52 L63 60 M63 52 L55 60" stroke="#FF6B6B" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>Registration Gaps</h3>
                    <p className={styles.problemCardBody}>
                      Is your work registered with ASCAP? BMI? SESAC? Missing one means missing money.
                    </p>
                  </div>
                </div>

                {/* Card 6: Trust Their Math? */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg viewBox="0 0 100 100" fill="none">
                      {/* File icon - centered */}
                      <g transform="scale(2.8) translate(6, 10)">
                        <path
                          d="M7 21C5.89543 21 5 20.1046 5 19V3H14L19 8V19C19 20.1046 18.1046 21 17 21H7Z"
                          stroke="#333"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        <path d="M13 3V9H19" stroke="#333" strokeWidth="1" strokeLinejoin="round" fill="none" />
                        <path d="M9 13H15" stroke="#333" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 17H15" stroke="#333" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                      </g>

                      {/* Magnifying glass overlay - positioned bottom right, smaller */}
                      <g transform="translate(48, 52) scale(1.9)">
                        <circle cx="11" cy="11" r="8" stroke="#4A90E2" strokeWidth="2" fill="white" />
                        <path
                          d="M11 6C13.7614 6 16 8.23858 16 11"
                          stroke="#4A90E2"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <line
                          x1="16.65"
                          y1="16.65"
                          x2="21"
                          y2="21"
                          stroke="#4A90E2"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </g>
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>Trust Their Math?</h3>
                    <p className={styles.problemCardBody}>
                      Your label's statement doesn't add up. But you can't prove it. So you just sign off.
                    </p>
                  </div>
                </div>

                {/* Card 7: Admin Needed? */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg viewBox="0 0 100 100" fill="none">
                      {/* Detailed Earth globe - scaled and centered */}
                      <g transform="translate(18, 18) scale(1)">
                        <path
                          d="M32,0C14.327,0,0,14.327,0,32s14.327,32,32,32s32-14.327,32-32S49.673,0,32,0z M27.819,6.415l0.176-0.205 c0.446-0.515,0.951-1.098,1.027-2.1c0.066-0.833-0.228-1.421-0.546-1.897C29.633,2.077,30.807,2,32,2 c1.465,0,2.903,0.11,4.312,0.313c0.262,0.327,0.606,0.668,1.164,0.897c0.592,0.255,1.291,0.457,2.171,0.249 c0.26-0.062,0.462-0.172,0.636-0.292c0.618,0.177,1.229,0.369,1.831,0.584c0.211,0.609,0.616,1.335,1.604,1.46 c0.556,0.079,1.021-0.008,1.428-0.183c8.475,4.139,14.702,12.153,16.39,21.734c-0.164,0.346-0.188,0.686-0.193,0.901 c-0.002,0.06,0.003,0.121,0.008,0.137c-0.036,0.056-0.082,0.085-0.305,0.192c-0.255,0.123-0.603,0.291-0.924,0.629 c-0.365,0.377-0.533,0.75-0.668,1.05c-0.105,0.234-0.165,0.361-0.274,0.47c-0.07,0.068-0.206,0.109-0.42,0.171 c-0.418,0.12-1.049,0.301-1.473,0.988c-0.403,0.649-0.369,1.249-0.345,1.687c0.003,0.05,0.007,0.101,0.009,0.153 c-0.077,0.038-0.171,0.077-0.269,0.109c0.058-0.316,0.066-0.753-0.217-1.202c-0.382-0.583-0.887-0.671-1.153-0.671 c-0.508,0-0.891,0.292-1.137,0.531c0.005-0.484-0.006-0.93-0.085-1.264c-0.074-0.336-0.027-0.523,0.131-1.065l0.055-0.19 c0.071-0.258,0.212-0.442,0.406-0.698c0.267-0.35,0.599-0.785,0.757-1.457c0.177-0.732,0.125-1.272,0.074-1.795 c-0.019-0.185-0.038-0.38-0.047-0.605l-0.019-0.529c-0.02-0.622-0.036-1.159-0.189-1.943l-0.069-0.349 c-0.154-0.787-0.288-1.466-0.85-2.323c-0.481-0.719-0.861-1.224-1.704-1.672c-0.199-0.109-0.406-0.197-0.617-0.263 c-0.341-0.114-0.653-0.153-0.955-0.192l-0.312-0.042c-0.533-0.078-1.013,0.015-1.366,0.087c-0.286,0.058-0.468,0.105-0.611,0.026 c-0.143-0.078-0.211-0.16-0.388-0.384c-0.094-0.119-0.193-0.244-0.324-0.389c-0.132-0.142-0.222-0.274-0.309-0.399 c-0.172-0.245-0.385-0.551-0.76-0.854c-0.4-0.325-0.705-0.553-1.279-0.754c-1.021-0.338-1.96-0.086-2.77,0.201 c-0.664,0.23-1.069,0.564-1.428,0.858c-0.157,0.13-0.323,0.268-0.484,0.376c-0.158,0.092-0.3,0.156-0.434,0.22 c-0.316,0.147-0.675,0.315-1.072,0.668c-0.276,0.242-1.213,0.853-1.43,0.908c-0.097-0.004-0.193-0.043-0.368-0.118 c-0.226-0.098-0.534-0.229-0.89-0.258l-0.217-0.013c-0.067,0-0.136,0.004-0.187,0.009c-0.454,0.034-0.773,0.182-1.008,0.289 c-0.092,0.042-0.186,0.09-0.304,0.119c-0.346,0.086-0.736,0.08-1.128,0.059c-0.627-0.032-1.242-0.014-1.806,0.146 c-0.463,0.131-0.798,0.357-1.042,0.523c-0.263,0.178-0.326,0.209-0.426,0.21c-0.101,0-0.173-0.042-0.452-0.262 c-0.276-0.218-0.655-0.517-1.214-0.672c-0.403-0.108-0.69-0.143-0.994-0.18l-0.277-0.034c-0.525-0.076-0.9-0.107-1.325-0.142 c-0.197-0.016-0.405-0.032-0.648-0.056l-0.282-0.005l-0.046,0.018c-0.033,0.002-0.072,0.004-0.115,0.006l-0.011-0.007 c-0.32-0.223-0.651-0.452-1.137-0.688c-0.358-0.176-0.649-0.31-0.969-0.425c-0.014-0.357-0.054-0.833-0.161-1.153 c-0.023-0.073-0.047-0.137-0.078-0.217c0.011-0.046,0.031-0.123,0.07-0.24c0.13-0.376,0.332-0.658,0.42-0.771 c0.054-0.037,0.104-0.069,0.152-0.101c0.187-0.12,0.418-0.27,0.656-0.528c0.667-0.706,0.97-1.387,1.046-2.357 c0.06-0.866-0.423-1.448-0.743-1.834C24.52,9.293,24.378,9.122,24.358,9.1c0.043-0.169,0.118-0.242,0.536-0.519 c0.228-0.151,0.466-0.312,0.693-0.511c0.258-0.223,0.506-0.364,0.792-0.527C26.827,7.288,27.334,6.999,27.819,6.415z M4.406,43.785 c-1.138-2.661-1.9-5.521-2.225-8.511c0.245-0.46,0.542-0.906,0.946-1.398c0.289-0.345,0.596-0.554,0.95-0.795 c0.431-0.294,0.92-0.628,1.383-1.207c0.556-0.677,0.738-1.399,0.885-1.98c0.158-0.623,0.248-0.933,0.578-1.162 c0.46-0.314,0.824-0.348,1.484-0.41c0.237-0.021,0.488-0.046,0.765-0.085l0.368-0.054c1.298-0.191,2.127-0.277,3.206,0.027 c0.732,0.205,1.183,0.547,1.754,0.979c0.376,0.285,0.802,0.607,1.346,0.918c0.422,0.241,0.779,0.507,1.124,0.764 c0.771,0.573,1.568,1.165,2.893,1.359c0.76,0.105,1.4-0.13,1.885-0.313c0.243-0.093,0.473-0.18,0.616-0.18 c0.033,0,0.075,0.003,0.143,0.04c0.655,0.364,0.801,0.666,0.828,0.873c-0.14,0.039-0.343,0.074-0.492,0.101 c-0.703,0.123-2.011,0.352-2.162,1.699c-0.076,0.65,0.147,1.057,0.35,1.283c0.524,0.591,1.501,0.528,2.602,0.28 c0.474-0.107,0.965-0.219,1.358-0.219c0.179,0,0.285,0.024,0.333,0.041c0.29,0.105,0.603,0.182,0.908,0.254 c0.134,0.031,0.313,0.073,0.467,0.115c-0.113,0.021-0.229,0.042-0.327,0.059c-0.461,0.079-0.982,0.169-1.459,0.396 c-0.376,0.175-0.697,0.341-0.998,0.498c-0.614,0.318-1.1,0.57-1.84,0.771c-0.226,0.06-0.569,0.009-0.93-0.052 c-0.286-0.049-0.581-0.099-0.893-0.099c-0.738,0-1.319,0.293-1.723,0.865c-0.924,1.292-0.376,2.643-0.112,3.294 c0.359,0.883,1.205,1.936,3.187,1.936c0.933,0,2.012-0.227,3.395-0.713c0.954-0.338,1.513-0.949,1.961-1.441 c0.362-0.398,0.648-0.712,1.11-0.918l0.509-0.232c1.048-0.483,1.815-0.827,2.639-0.439c0.221,0.104,0.317,0.302,0.518,0.798 c0.233,0.578,0.553,1.37,1.444,1.844c0.811,0.43,1.824,0.274,2.564,0.062c0.444-0.127,0.8-0.236,1.058-0.085 c0.271,0.161,0.383,0.379,0.589,0.817c0.184,0.391,0.412,0.877,0.853,1.339c0.132,0.139,0.256,0.274,0.375,0.404 c0.731,0.801,1.423,1.557,2.792,1.881c0.197,0.046,0.398,0.069,0.598,0.069c0.7,0,1.263-0.279,1.715-0.504 c0.388-0.192,0.687-0.336,0.931-0.26c1.021,0.334,1.233,0.563,1.329,0.971c0.084,0.327-0.262,0.602-1.544,1.221 c-0.204,0.099-0.407,0.197-0.6,0.297c-0.689,0.355-1.205,0.399-1.986,0.466c-0.312,0.026-0.645,0.055-1.004,0.104 c-0.725,0.091-1.38,0.248-2.014,0.4c-0.731,0.176-1.422,0.341-2.023,0.341s-1.081-0.165-1.545-0.529 c-0.38-0.304-0.556-0.627-0.8-1.073c-0.177-0.324-0.377-0.691-0.693-1.109c-0.279-0.352-0.519-0.858-0.751-1.349 c-0.512-1.083-1.149-2.431-2.598-2.431c-0.247,0-0.504,0.044-0.764,0.132c-1.126,0.379-1.501,1.281-1.775,1.939 c-0.118,0.283-0.229,0.55-0.379,0.77c-0.375,0.535-0.564,1.103-0.732,1.604c-0.281,0.841-0.369,0.94-0.593,0.973 c-0.361,0.052-0.588-0.101-1.125-0.489c-0.16-0.116-0.326-0.237-0.502-0.353c-0.346-0.23-0.55-0.485-0.809-0.809 c-0.289-0.361-0.617-0.771-1.154-1.157c-0.597-0.44-1.136-0.651-1.611-0.838c-0.384-0.15-0.716-0.28-1.082-0.523 c-0.139-0.093-0.262-0.249-0.405-0.431c-0.325-0.412-0.816-1.035-1.786-1.07l-0.101-0.002c-0.731,0-1.752,0.26-2.466,1.497 c-0.259,0.448-0.44,1.053-0.634,1.693c-0.314,1.045-0.745,2.474-1.42,2.474h-0.001c-0.698-0.047-2.753-1.846-3.741-2.711 c-0.708-0.62-1.32-1.155-1.761-1.447l-0.332-0.229C6.498,44.301,5.72,43.76,4.692,43.76C4.598,43.76,4.502,43.775,4.406,43.785z M32,62c-11.484,0-21.458-6.456-26.499-15.936c0.192,0.117,0.393,0.252,0.608,0.401l0.362,0.249 c0.336,0.223,0.928,0.74,1.555,1.289c2.08,1.82,3.65,3.115,4.929,3.202c2.26,0.149,2.986-2.301,3.466-3.893 c0.151-0.503,0.309-1.023,0.451-1.271c0.265-0.458,0.518-0.496,0.772-0.497c0.056,0.03,0.189,0.2,0.277,0.312 c0.206,0.262,0.464,0.588,0.867,0.857c0.547,0.363,1.032,0.553,1.462,0.721c0.412,0.161,0.768,0.301,1.162,0.593 c0.325,0.232,0.531,0.491,0.771,0.79c0.309,0.385,0.657,0.82,1.265,1.226c0.154,0.102,0.296,0.205,0.434,0.304 c0.648,0.472,1.395,1.017,2.58,0.852c1.505-0.216,1.928-1.481,2.208-2.318c0.137-0.408,0.266-0.793,0.481-1.102 c0.272-0.398,0.436-0.791,0.579-1.137c0.257-0.616,0.342-0.737,0.568-0.813c0.07-0.024,0.108-0.031,0.134-0.027 c0.203,0.064,0.579,0.859,0.781,1.286c0.267,0.565,0.57,1.205,0.978,1.719c0.213,0.281,0.361,0.554,0.52,0.842 c0.286,0.525,0.611,1.121,1.312,1.683c0.827,0.647,1.738,0.962,2.788,0.962c0.838,0,1.641-0.192,2.489-0.396 c0.581-0.14,1.183-0.284,1.808-0.362c0.332-0.045,0.632-0.07,0.913-0.095c0.87-0.073,1.691-0.144,2.735-0.682 c0.178-0.092,0.364-0.182,0.552-0.272c1.245-0.602,3.127-1.511,2.616-3.499c-0.388-1.654-1.859-2.136-2.657-2.396 c-0.252-0.08-0.511-0.121-0.77-0.121c-0.673,0-1.223,0.273-1.665,0.493c-0.384,0.191-0.705,0.338-0.966,0.279 c-0.766-0.182-1.145-0.597-1.772-1.283c-0.127-0.14-0.26-0.283-0.402-0.434c-0.218-0.229-0.345-0.499-0.492-0.812 c-0.252-0.536-0.565-1.203-1.377-1.686c-0.816-0.485-1.87-0.337-2.635-0.116c-0.441,0.127-0.797,0.239-1.069,0.093 c-0.228-0.12-0.331-0.332-0.529-0.825c-0.24-0.595-0.568-1.41-1.52-1.859c-0.528-0.248-1.053-0.369-1.603-0.369 c-0.99,0-1.834,0.39-2.728,0.803l-0.483,0.221c-0.845,0.376-1.36,0.942-1.775,1.397c-0.388,0.426-0.668,0.733-1.147,0.902 c-1.146,0.403-2.039,0.6-2.729,0.6c-0.928,0-1.195-0.35-1.334-0.689c-0.338-0.833-0.306-1.108-0.018-1.405 c0.175,0,0.362,0.037,0.557,0.07c0.522,0.088,1.2,0.164,1.782,0.013c0.954-0.258,1.581-0.584,2.245-0.929 c0.278-0.145,0.573-0.298,0.927-0.463c0.235-0.111,0.598-0.174,0.947-0.234c0.777-0.134,2.396-0.411,2.278-2.084 c-0.121-1.496-1.484-1.816-2.299-2.008c-0.229-0.054-0.464-0.106-0.689-0.188c-0.284-0.101-0.594-0.153-0.944-0.159 c0.146-0.216,0.247-0.484,0.275-0.82c0.085-1.224-0.538-2.215-1.855-2.946c-0.35-0.193-0.724-0.291-1.111-0.291 c-0.512,0-0.945,0.165-1.327,0.311c-0.344,0.13-0.644,0.238-0.889,0.203c-0.82-0.12-1.309-0.483-1.984-0.985 c-0.374-0.278-0.799-0.594-1.325-0.896c-0.433-0.246-0.771-0.503-1.13-0.774c-0.651-0.493-1.324-1.004-2.42-1.312 c-1.395-0.392-2.583-0.296-4.041-0.08l-0.359,0.053c-0.238,0.034-0.458,0.054-0.666,0.073c-0.757,0.071-1.539,0.144-2.433,0.754 c-0.967,0.672-1.197,1.585-1.383,2.319c-0.118,0.467-0.221,0.87-0.501,1.213c-0.283,0.354-0.58,0.556-0.955,0.812 c-0.295,0.201-0.617,0.425-0.947,0.734C2.004,32.108,2,32.055,2,32C2,17.388,12.45,5.221,26.283,2.551 c0.111,0.172,0.225,0.339,0.334,0.49c0.348,0.48,0.434,0.633,0.411,0.915c-0.025,0.331-0.151,0.49-0.545,0.944L26.287,5.13 c-0.26,0.312-0.527,0.465-0.898,0.676c-0.328,0.188-0.701,0.4-1.111,0.754c-0.163,0.142-0.33,0.25-0.488,0.354 c-0.477,0.316-1.131,0.75-1.371,1.701c-0.244,0.983,0.319,1.662,0.656,2.068c0.108,0.132,0.291,0.352,0.287,0.411 c-0.04,0.51-0.147,0.753-0.514,1.14c-0.071,0.078-0.133,0.119-0.276,0.212c-0.113,0.072-0.232,0.15-0.364,0.251l-0.121,0.11 c-0.06,0.063-0.586,0.643-0.898,1.551c-0.237,0.715-0.247,1.088-0.044,1.598l0.044,0.118c0.036,0.121,0.07,0.547,0.072,0.822 l-0.084,1.218l0.814,0.203c0.535,0.133,0.806,0.244,1.353,0.514c0.351,0.169,0.582,0.33,0.874,0.533l0.294,0.199 c0.392,0.234,0.79,0.193,1.213,0.146c0.211,0.021,0.397,0.035,0.574,0.05c0.385,0.03,0.725,0.058,1.209,0.128l0.314,0.039 c0.244,0.03,0.438,0.051,0.708,0.123c0.154,0.043,0.285,0.143,0.502,0.313c0.37,0.292,0.877,0.691,1.705,0.691 c0.724-0.005,1.192-0.323,1.534-0.556c0.198-0.134,0.317-0.212,0.465-0.253c0.348-0.099,0.746-0.095,1.151-0.074 c0.584,0.033,1.175,0.021,1.723-0.115c0.255-0.064,0.458-0.152,0.652-0.242c0.17-0.078,0.233-0.105,0.254-0.109l0.072,0.002 L36.64,19.7c0.066,0.005,0.169,0.049,0.299,0.104c0.257,0.11,0.608,0.262,1.138,0.28c1.079,0,2.751-1.39,2.771-1.407 c0.186-0.164,0.341-0.236,0.599-0.357c0.182-0.085,0.373-0.176,0.636-0.329c0.276-0.183,0.496-0.361,0.704-0.532 c0.294-0.241,0.487-0.401,0.82-0.517c0.697-0.248,1.029-0.34,1.461-0.194c0.247,0.086,0.347,0.155,0.666,0.414 c0.156,0.126,0.239,0.246,0.379,0.445c0.136,0.195,0.28,0.397,0.475,0.605c0.087,0.097,0.159,0.188,0.227,0.275 c0.218,0.275,0.489,0.619,0.997,0.899c0.633,0.344,1.408,0.294,1.978,0.179c0.256-0.052,0.455-0.1,0.668-0.067l0.354,0.048 c0.244,0.031,0.42,0.054,0.591,0.11c0.086,0.026,0.176,0.062,0.284,0.12c0.438,0.233,0.602,0.441,0.987,1.017 c0.342,0.522,0.417,0.906,0.554,1.604l0.071,0.357c0.121,0.615,0.134,1.033,0.151,1.611l0.02,0.551 c0.011,0.265,0.032,0.497,0.054,0.716c0.043,0.438,0.071,0.728-0.028,1.138c-0.059,0.25-0.178,0.415-0.402,0.709 c-0.254,0.333-0.57,0.748-0.74,1.369l-0.05,0.17c-0.181,0.62-0.353,1.206-0.16,2.073c0.045,0.193,0.036,0.76,0.029,1.174 c-0.019,1.132-0.03,1.88,0.444,2.362c0.217,0.221,0.505,0.342,0.811,0.342l0.31-0.021l0.204-0.098 c0.285-0.136,0.532-0.331,0.754-0.547c0.008,0.018,0.015,0.035,0.022,0.053c0.275,0.614,0.863,0.967,1.615,0.967 c0.824,0,2.492-0.584,2.606-1.665c0.027-0.285,0.016-0.543,0.002-0.786c-0.021-0.351-0.014-0.419,0.053-0.526 c0.039-0.03,0.207-0.079,0.318-0.11c0.35-0.101,0.827-0.237,1.269-0.664c0.387-0.384,0.56-0.77,0.699-1.079 c0.104-0.232,0.164-0.359,0.286-0.485c0.072-0.076,0.17-0.126,0.348-0.211C61.964,30.525,62,31.258,62,32 C62,48.568,48.568,62,32,62z"
                          fill="#231F20"
                        />
                      </g>

                      {/* Dollar sign overlay - centered and prominent */}
                      <g transform="translate(50, 50)">
                        <circle cx="0" cy="0" r="18" fill="white" opacity="0.9" />
                        <text
                          x="0"
                          y="0"
                          fontSize="32"
                          fontWeight="bold"
                          fill="#50C878"
                          stroke="#2a2a2a"
                          strokeWidth="0.8"
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          $
                        </text>
                      </g>
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>Admin Needed?</h3>
                    <p className={styles.problemCardBody}>
                      ASCAP, BMI, SESAC, SoundExchange, HFA... Overwhelmed yet? One platform beats twelve logins.
                    </p>
                  </div>
                </div>

                {/* Card 8: Unauthorized Usage */}
                <div className={styles.problemCard}>
                  <div className={styles.problemCardIconWrapper}>
                    <svg viewBox="0 0 58.32 58.32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M33.47,36.538c0.102-0.43,0.172-0.885,0.193-1.372c0.404-8.843-4.428-16.084-11.671-20.739 c-4.308-2.77-8.394,0.25-9.432,4.101c-2.67-2.125-7.294,1.055-5.214,4.548c0.076,0.127,0.154,0.255,0.232,0.383 c-2.088-0.008-8.742-0.029-6.879,0.002c2.202,0.038,7.486,5.964,7.486,5.964v-5c1.623,2.482,3.698,4.804,6.786,5.155 c1.408,0.161,2.571-0.275,3.527-1.038c1.207,1.477,1.822,3.135,1.942,5.125c-1.057-0.016-2.117,0.027-3.187,0.152 c-3.691,0.435-5.969,1.248-6.715,5.109c-1.122,5.824,1.907,10.078,5.174,14.53c2.658,3.621,8.776,0.112,6.083-3.56 c-2.202-3-4.417-5.465-4.326-8.951c2.152-0.327,4.292-0.239,6.477-0.03c1.069,0.46,2.275,0.646,3.469,0.553 c1.781,5.955,5.163,11.259,9.543,15.783c3.166,3.271,8.143-1.722,4.982-4.979C37.597,47.782,34.688,42.585,33.47,36.538z"
                        fill="#010002"
                      />
                      <path
                        d="M6.805,7.951c0.009,0.1,0.012,0.2,0.026,0.301c0.449,3.26,3.454,5.539,6.712,5.09 c3.26-0.448,5.536-3.452,5.09-6.712c-0.092-0.678-0.3-1.309-0.594-1.885c0.201-0.097,0.292-0.328,0.224-0.809l-0.194-1.423 c-0.22-1.591-1.687-2.705-3.276-2.485l-6.342,0.87c-1.595,0.22-2.706,1.687-2.487,3.28l0.155,1.151 C5.23,6.038,4.479,6.934,4.642,7.884C4.784,8.727,5.718,8.518,6.805,7.951z"
                        fill="#010002"
                      />
                      <path
                        d="M22.894,13.399c0,0,14.28,7.656,12.593,18.94c-3.698,9.408,12.449,19.098,21.229-2.6 C56.715,29.739,67.895,0.001,22.894,13.399z M47.071,31.105v1.814h-1.93v-1.707c-0.894-0.084-1.783-0.379-2.358-0.787 l-0.271-0.195l0.7-1.958l0.47,0.313c0.609,0.407,1.396,0.642,2.15,0.642c0.923,0,1.539-0.479,1.539-1.19 c0-0.48-0.191-1.001-1.604-1.573c-1.492-0.584-3.021-1.435-3.021-3.287c0-1.489,0.979-2.65,2.514-3.037v-1.763h1.913v1.643 c0.731,0.074,1.37,0.277,1.945,0.614l0.321,0.19l-0.73,1.928l-0.45-0.256c-0.264-0.151-0.887-0.508-1.876-0.508 c-0.975,0-1.322,0.512-1.322,0.991c0,0.519,0.258,0.855,1.791,1.491c1.326,0.54,2.853,1.422,2.853,3.451 C49.702,29.458,48.659,30.7,47.071,31.105z"
                        fill="#010002"
                      />
                    </svg>
                  </div>
                  <div className={styles.problemCardText}>
                    <h3 className={styles.problemCardHeadline}>
                      <span style={{ opacity: 0.5, fontSize: '0.7em', display: 'block', marginBottom: '4px' }}>
                        TuneScan
                      </span>
                      Someone's Using Your Works
                    </h3>
                    <p className={styles.problemCardBody}>
                      Right now. On YouTube. TikTok. Instagram. DSPs. Unlicensed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInAnimation>

        <Spacing height="80px" className="hidden md:block" />
        <Spacing height="32px" className="md:hidden" />
      </div>

      {/* Catalog Demo Section */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <CatalogDemo />
      </div>

      <div className={`${styles.container} ${styles.containerCards}`}>
        <Spacing height="80px" className="hidden md:block" />
        <Spacing height="32px" className="md:hidden" />

        {/* Email Signup Section */}
        <FadeInAnimation id="signup">
          <div className={styles.signupSection}>
            <h2 className={styles.signupTitle}>Be the First to Know</h2>
            <p className={styles.signupDescription}>
              Join our waitlist and get early access when we launch. We'll send you updates on our progress and notify
              you the moment we're live.
            </p>

            <form onSubmit={handleSubmit} className={styles.signupForm}>
              <div className={styles.inputWrapper}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={status === 'loading'}
                  className={styles.emailInput}
                />
                <button type="submit" disabled={status === 'loading'} className={styles.submitButton}>
                  {status === 'loading' ? 'Submitting...' : 'Notify Me'}
                </button>
              </div>

              {message && <div className={`${styles.message} ${styles[status]}`}>{message}</div>}
            </form>
          </div>
        </FadeInAnimation>

        <Spacing height="120px" className="hidden md:block" />
        <Spacing height="48px" className="md:hidden" />
      </div>
      <Footer />
    </>
  );
};

export default PreLaunch;
