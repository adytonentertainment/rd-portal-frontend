import { Helmet } from 'react-helmet-async';
import NavBar from '../../components/NavBar/NavBar';
import styles from './home.module.css';
import Button from '../../components/Buttons/Button/Button';
import Spacing from '../../components/Spacing';
import FadeInAnimation from '../../components/FadeInAnimation';
import { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import Footer from '../../components/Footer/Footer';
import {
  FaMagnifyingGlass,
  FaChartLine,
  FaHandshake,
  FaFileContract,
  FaChevronDown,
  FaChevronRight,
  FaCalendarDays,
  FaClipboardList,
  FaCircleQuestion,
  FaPenToSquare,
} from 'react-icons/fa6';
import { BsSoundwave } from 'react-icons/bs';
import { FaDollarSign, FaGlobe, FaUserTie } from 'react-icons/fa';
import { TbContract } from 'react-icons/tb';
import { MdLibraryMusic, MdDashboard } from 'react-icons/md';
import { BiCheckShield } from 'react-icons/bi';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import { useNavigate } from 'react-router-dom';
import TransparentButton from '../../components/Buttons/TransparentButton/TransparentButton';
import Particles from '../../components/Particles/Particles';
import SpotlightCard from '../../components/SpotlightCard/SpotlightCard';
import CatalogDemo from '../../components/CatalogDemo/CatalogDemo';
import HowItWorks from '../../components/HowItWorks/HowItWorks';
import LogoLoop from '../../components/LogoLoop/LogoLoop';
import { Card, CardHeader, CardBody, Divider } from '@heroui/react';
import { Radio, Grid3x3, FileText, Clock, Scale } from 'lucide-react';

const moneyProblemCards = [
  {
    icon: Radio,
    title: 'Unauthorized usage.',
    description:
      'Your music is being played on radio, broadcast on TV, streamed on DSPs without your knowledge. RD uses fingerprinting to detect usage you were never notified about and surfaces it so you can claim what is owed.',
  },
  {
    icon: Grid3x3,
    title: 'Registration gaps.',
    description:
      'Every territory where you are not registered is a territory where you are not collecting. Missing society accounts, incomplete metadata, unregistered works. Multiply that across your catalog and the leaks add up fast. Most people do not even know where the gaps are.',
  },
  {
    icon: FileText,
    title: 'Revenue opacity.',
    description:
      'You get summaries. Maybe you get CSVs. Either way you are looking at numbers without context. No breakdown by platform, territory, or song. No way to spot what is wrong. RD turns raw transaction data into something you can actually read, compare, and act on.',
  },
  {
    icon: Clock,
    title: 'Admin overload.',
    description:
      'Society logins. Quarterly deadlines. Metadata updates. Registration follow ups. For one person this is a full time job. For a small publisher it is three. RD compresses hours of admin into minutes.',
  },
  {
    icon: Scale,
    title: 'No infrastructure, no leverage.',
    description:
      'Without systems, creators depend on whoever offers them a deal. Publishers depend on manual processes that break at scale. Both problems have the same solution.',
  },
];

const CATALOG_SIZES = ['1-50 songs', '50-500 songs', '500-5,000 songs', '5,000-50,000 songs', '50,000+'];
const ROLES = ['Artist / Producer', 'Songwriter', 'Publisher', 'Manager', 'Label', 'Distributor', 'Other'];
const INTERESTS = [
  'Royalty Auditing',
  'Catalog Management',
  'Revenue Analytics',
  'CWR / Work Registration',
  'Rights Administration',
  'All of the above',
];

const demoInputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid var(--border, #e2ddd5)',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #111)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const DemoModal = ({ isOpen, onClose, source = 'demo' }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [catalogSize, setCatalogSize] = useState('');
  const [role, setRole] = useState('');
  const [interest, setInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const FORMSPREE_URL = 'https://formspree.io/f/myznqnnn';

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          _subject: source === 'discount' ? 'Early Bird Discount Signup' : 'Demo Request',
          source: source,
        }),
      });
      setStep(2);
    } catch {
      // still advance
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async () => {
    setLoading(true);
    try {
      await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name || null,
          company: company || null,
          catalog_size: catalogSize || null,
          role: role || null,
          interest: interest || null,
          notes: notes || null,
          _subject: `${source === 'discount' ? 'Early Bird' : 'Demo'} - Details from ${email.trim()}`,
          source: source,
        }),
      });
    } catch {
      // silent — don't block the user
    } finally {
      setLoading(false);
      setStep(3);
    }
  };

  const handleClose = () => {
    // If user entered an email but didn't submit yet, capture it before closing
    if (step === 1 && email.trim() && email.includes('@')) {
      fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          _subject: source === 'discount' ? 'Early Bird Discount (closed early)' : 'Demo Request (closed early)',
          source: source,
          note: 'User closed modal before submitting',
        }),
      }).catch(() => {});
    }
    setStep(1);
    setEmail('');
    setName('');
    setCompany('');
    setCatalogSize('');
    setRole('');
    setInterest('');
    setNotes('');
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="demo-modal-content"
        style={{
          background: 'var(--panel-bg, #fff)',
          border: '1px solid var(--border, #e2ddd5)',
          borderRadius: '16px',
          padding: '32px',
          width: '480px',
          maxWidth: '92vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {step === 1 && (
          <>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
              {source === 'discount' ? 'Claim Your Early Bird Discount' : 'Request a Demo'}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--soft-text)' }}>
              {source === 'discount'
                ? 'Enter your email to lock in early bird pricing for life.'
                : "Enter your email and we'll reach out to schedule a walkthrough."}
            </p>
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...demoInputStyle, marginBottom: '16px' }}
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: loading || !email.trim() ? '#888' : 'var(--secondary, #111)',
                  color: 'var(--secondary-text, #fff)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Submitting...' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div
              style={{
                background: 'var(--success, #22c55e)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {source === 'discount' ? 'Discount locked in!' : "You're on the list!"}
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>Tell us about yourself</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--soft-text)' }}>
              {source === 'discount'
                ? 'Help us understand your needs so we can set you up with the right plan.'
                : 'Help us tailor your demo. The more we know, the better we can show you what matters.'}
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border, #e2ddd5)', margin: '0 0 20px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={demoInputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Company / Organization
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={demoInputStyle}
                />
              </div>

              <div className="demo-modal-row" style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                    Catalog Size
                  </label>
                  <select value={catalogSize} onChange={(e) => setCatalogSize(e.target.value)} style={demoInputStyle}>
                    <option value="">Select range</option>
                    {CATALOG_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                    I am a...
                  </label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={demoInputStyle}>
                    <option value="">Select type</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Most interested in...
                </label>
                <select value={interest} onChange={(e) => setInterest(e.target.value)} style={demoInputStyle}>
                  <option value="">Select a feature</option>
                  {INTERESTS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Anything else you'd like us to know?
                </label>
                <textarea
                  placeholder="Optional - tell us about your needs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ ...demoInputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}
            >
              <button
                onClick={() => setStep(3)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #e2ddd5)',
                  background: 'transparent',
                  color: 'var(--text, #111)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Skip for now
              </button>
              <button
                onClick={handleDetailsSubmit}
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: loading ? '#888' : 'var(--secondary, #111)',
                  color: 'var(--secondary-text, #fff)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#10003;</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>You're all set!</h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--soft-text)' }}>
              {source === 'discount'
                ? "Your early bird pricing is locked in. We'll be in touch soon."
                : "We'll reach out to schedule your demo."}
            </p>
            <button
              onClick={handleClose}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--secondary, #111)',
                color: 'var(--secondary-text, #fff)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Home = () => {
  const [scrollIndicatorOpacity, setScrollIndicatorOpacity] = useState(1);
  const [expandedCard, setExpandedCard] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSource, setDemoSource] = useState('demo');
  const [heroEmail, setHeroEmail] = useState('');
  const { currentTheme } = useContext(ThemeContext);

  const navigate = useNavigate();

  useEffect(() => {
    // Handle scroll to fade out the scroll indicator
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Fade out between 0 and 300px of scroll
      const opacity = Math.max(0, 1 - scrollY / 300);
      setScrollIndicatorOpacity(opacity);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>RD - Home</title>
      </Helmet>
      {/* Particles Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <Particles
          particleColors={currentTheme === 'dark' ? ['#ffffff'] : ['#000000']}
          particleCount={200}
          particleSpread={10}
          speed={0.005}
          particleBaseSize={100}
          moveParticlesOnHover
          alphaParticles
          disableRotation={false}
          pixelRatio={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          className="early-access-banner"
          onClick={() => {
            setDemoSource('discount');
            setShowDemoModal(true);
          }}
          style={{
            background: '#f59e0b',
            color: '#000',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px',
            flexWrap: 'nowrap',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              background: '#000',
              color: '#f59e0b',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Early Access
          </span>
          <span className="banner-text-full" style={{ opacity: 0.9 }}>
            Sign up now and lock in early bird pricing for life
          </span>
          <span className="banner-dot" style={{ opacity: 0.4 }}>
            ·
          </span>
          <span className="banner-text-sub" style={{ opacity: 0.7 }}>
            Limited spots available
          </span>
          <span
            style={{
              background: '#000',
              border: '1px solid #000',
              color: '#fff',
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Claim Discount &rarr;
          </span>
        </div>
        <NavBar />
      </div>
      <div className="relative" style={{ position: 'relative', zIndex: 1 }}>
        <div className={`${styles.container} ${styles.containerCards}`}>
          <div className="flex min-h-[calc(100svh-100px)] sm:min-h-screen flex-col justify-center items-center pt-10 sm:pt-16">
            <FadeInAnimation id="hero" className="text-center flex-grow flex items-center">
              <div className={`mx-auto max-w-5xl ${styles.heroCentered}`}>
                <div className="text-[26px] sm:text-[36px] md:text-[48px] font-semibold leading-[1.15] sm:leading-[1.2] tracking-[-0.02em] mb-3 sm:mb-6 px-2 sm:px-0">
                  <div id="line1" className="mx-auto mb-1 sm:mb-3">
                    Catalog management infrastructure
                  </div>
                  <div id="line2" className="mx-auto">
                    for creators and rights holders.
                  </div>
                </div>
                <div
                  id="description"
                  className="text-[14px] sm:text-[16px] md:text-[18px] font-normal text-center max-w-4xl mx-auto mb-6 sm:mb-12 leading-[1.5] sm:leading-[1.6] text-gray-600 px-4 sm:px-2"
                >
                  Whether you're a producer collecting your first royalties, an indie artist or a publisher
                  administering thousands of copyrights, RD gives you the infrastructure to track, audit, recover, and
                  collect, built around your catalog, on your terms.
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 justify-center mt-4 sm:mt-8 px-4 sm:px-0">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={heroEmail}
                    onChange={(e) => setHeroEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = heroEmail.trim();
                        if (!val || !val.includes('@')) return;
                        fetch('https://formspree.io/f/myznqnnn', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                          body: JSON.stringify({
                            email: val,
                            _subject: 'Free Audit from Homepage',
                            source: 'homepage-hero',
                          }),
                        }).catch(() => {});
                        navigate(`/free-audit?email=${encodeURIComponent(val)}`);
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg, rgba(255,255,255,0.05))',
                      color: 'var(--text)',
                      fontSize: '15px',
                      minWidth: '240px',
                      outline: 'none',
                    }}
                  />
                  <FlatButton
                    className="primary"
                    onClick={() => {
                      const val = heroEmail.trim();
                      if (!val || !val.includes('@')) return;
                      fetch('https://formspree.io/f/myznqnnn', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify({
                          email: val,
                          _subject: 'Free Audit from Homepage',
                          source: 'homepage-hero',
                        }),
                      }).catch(() => {});
                      navigate(`/free-audit?email=${encodeURIComponent(val)}`);
                    }}
                  >
                    Get Free Audit
                  </FlatButton>
                </div>
              </div>
            </FadeInAnimation>

            {/* Scroll Indicator */}
            <div
              className={`flex flex-col items-center gap-2 transition-opacity duration-500 mb-10 sm:mb-20 md:mb-32 ${styles.scrollIndicator}`}
              style={{
                opacity: scrollIndicatorOpacity,
                pointerEvents: scrollIndicatorOpacity === 0 ? 'none' : 'auto',
              }}
            >
              <span className="text-xs sm:text-sm text-[var(--soft-text)]">Scroll down for more</span>
              <FaChevronDown className="text-[var(--soft-text)] text-lg sm:text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Cover Art Slider — social proof */}
      <FadeInAnimation id="catalog-slider">
        <div className="text-center px-4 sm:px-0 mb-6 sm:mb-10">
          <h2
            className="text-[26px] sm:text-[34px] md:text-[42px] font-bold mb-3 sm:mb-4"
            style={{ color: 'var(--text)' }}
          >
            Songs we manage.
          </h2>
          <p
            className="text-[14px] sm:text-[16px] md:text-[18px] max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--soft-text)' }}
          >
            Trusted by artists, producers, and publishers worldwide to manage their catalogs, track their royalties, and
            recover money they didn&apos;t know they were owed.
          </p>
        </div>
      </FadeInAnimation>
      <LogoLoop />

      <div className={`${styles.container} ${styles.containerCards}`}>
        {/* Feature Cards */}
        <div className="min-h-screen flex flex-col justify-center items-center py-12 sm:py-20">
          <FadeInAnimation id="feature-cards">
            <h2
              className="text-[26px] sm:text-[34px] md:text-[42px] font-bold mb-8 sm:mb-16 text-center"
              style={{ color: 'var(--text)' }}
            >
              The money problem nobody talks about.
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-3xl mx-auto">
              {moneyProblemCards.map((card, index) => {
                const isExpanded = expandedCard === index;
                const IconComp = card.icon;
                return (
                  <div
                    key={index}
                    className="card-spotlight neo-brutalist"
                    onClick={() => setExpandedCard(isExpanded ? null : index)}
                    style={{ cursor: 'pointer', padding: '16px 20px' }}
                  >
                    <div className="flex items-center gap-3" style={{ position: 'relative', zIndex: 2 }}>
                      <div
                        className="rounded-full p-2.5 w-fit flex-shrink-0"
                        style={{ background: 'var(--hover-bg, var(--surface))' }}
                      >
                        <IconComp className="h-4 w-4" style={{ color: 'var(--soft-text)' }} />
                      </div>
                      <h3
                        className="text-sm sm:text-lg flex-1"
                        style={{ color: 'var(--text)', margin: 0, fontWeight: 600 }}
                      >
                        {card.title}
                      </h3>
                      <FaChevronRight
                        style={{
                          color: 'var(--muted-text)',
                          fontSize: '12px',
                          transition: 'transform 0.3s ease',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        maxHeight: isExpanded ? '200px' : '0px',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease, opacity 0.3s ease',
                        opacity: isExpanded ? 1 : 0,
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      <p
                        className="leading-relaxed text-xs sm:text-sm"
                        style={{ color: 'var(--soft-text)', margin: 0, paddingTop: '12px', paddingLeft: '44px' }}
                      >
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </FadeInAnimation>
        </div>

        {/* Catalog Demo Section */}
        <div
          className="min-h-screen flex flex-col justify-center py-12 sm:py-20"
          style={{
            overflow: 'visible',
          }}
        >
          <FadeInAnimation id="catalog-demo">
            <div id="whats-included" style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 className="text-[26px] sm:text-[34px] md:text-[42px] font-bold mb-4" style={{ color: 'var(--text)' }}>
                What's Included
              </h2>
              <p className="text-[15px] sm:text-[16px] md:text-[18px] text-[var(--soft-text)] max-w-2xl mx-auto px-2">
                A complete platform for managing music catalog data, financial tracking, and rights administration.
                Built to handle the complexity of modern royalty accounting and registration systems.
              </p>
            </div>
            <CatalogDemo />
          </FadeInAnimation>
        </div>

        <div className="min-h-screen flex flex-col justify-center py-12 sm:py-20">
          <FadeInAnimation id="how-it-works">
            <HowItWorks />
          </FadeInAnimation>
        </div>

        <div className={styles.signupSection}>
          <h1>Your catalog deserves real infrastructure.</h1>
          <p>
            No equity taken. No percentages. No long term contracts. Whether you manage your own music or administer
            catalogs for others, RD scales to your operation and works on your terms.
          </p>
          <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-4 justify-center mt-6 sm:mt-8">
            <FlatButton className="primary" onClick={() => navigate('/free-audit')}>
              Get Free Audit
            </FlatButton>
            <FlatButton onClick={() => navigate('/signup')}>Get Started</FlatButton>
          </div>
        </div>
      </div>
      <Footer />
      <DemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} source={demoSource} />
    </>
  );
};

export default Home;
