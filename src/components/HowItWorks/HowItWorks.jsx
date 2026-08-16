import { useEffect, useRef, useState } from 'react';
import styles from './howItWorks.module.css';
import {
  FaClipboardList,
  FaCloudArrowUp,
  FaGlobe,
  FaTriangleExclamation,
  FaCheck,
  FaDollarSign,
  FaYoutube,
  FaSpotify,
} from 'react-icons/fa6';
import { MdContentCopy } from 'react-icons/md';
import { BsRecordCircle } from 'react-icons/bs';
import { LuRefreshCw } from 'react-icons/lu';

/* ───────── helpers ───────── */
function useInView(threshold = 0.4) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started, threshold]);
  return [ref, started];
}

function slideClass(current, index) {
  if (current === index) return styles.slideActive;
  return styles.slideNext;
}

/* ═══════════════════════════════════════════
   SCAN CARD  (Step 2)  –  3-slide carousel
   ═══════════════════════════════════════════ */
const issues = [
  { brand: 'bmi', label: 'BMI Statement Q4 2025', sub: '$1,240', tag: 'STATEMENT' },
  { brand: 'youtube', label: 'YouTube Content ID', sub: 'Sync mismatch', tag: 'COLLECTION' },
  { brand: 'spotify', label: 'Spotify Q1 Royalties', sub: '$3,850', tag: 'COLLECTION' },
  { brand: 'hfa', label: 'HFA Registration', sub: 'Incomplete metadata', tag: 'REGISTRATION' },
];

function BrandIcon({ brand }) {
  if (brand === 'youtube') return <FaYoutube size={14} />;
  if (brand === 'spotify') return <FaSpotify size={14} />;
  return <span className={styles.brandText}>{brand.toUpperCase()}</span>;
}

function ScanCard({ active, onComplete }) {
  const cardRef = useRef(null);
  const [cycle, setCycle] = useState(0);
  const [slide, setSlide] = useState(0);

  /* slide 0 */
  const [percent, setPercent] = useState(0);
  const [worksCount, setWorksCount] = useState(0);
  /* slide 1 */
  const [visibleIssues, setVisibleIssues] = useState([]);
  /* slide 2 */
  const [revenueVisible, setRevenueVisible] = useState(false);
  const [barWidths, setBarWidths] = useState([0, 0]);

  const resetState = () => {
    setPercent(0);
    setWorksCount(0);
    setVisibleIssues([]);
    setRevenueVisible(false);
    setBarWidths([0, 0]);
  };

  /* Start a new cycle each time active transitions to true */
  const prevActive = useRef(false);
  useEffect(() => {
    if (active && !prevActive.current) {
      resetState();
      setSlide(0);
      setCycle((c) => c + 1);
    }
    prevActive.current = active;
  }, [active]);

  /* Slide 0: scanning */
  useEffect(() => {
    if (cycle === 0 || slide !== 0) return;
    const duration = 3000;
    const target = 17;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.max(0, Math.min((now - t0) / duration, 1));
      setPercent(Math.round(p * 100));
      setWorksCount(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [cycle]);

  /* Slide 0 → 1 */
  useEffect(() => {
    if (percent < 100 || slide !== 0) return;
    const t = setTimeout(() => setSlide(1), 1500);
    return () => clearTimeout(t);
  }, [percent, slide]);

  /* Slide 1: stagger issues */
  useEffect(() => {
    if (slide !== 1) return;
    issues.forEach((_, i) => {
      setTimeout(() => setVisibleIssues((v) => [...v, i]), 300 + i * 350);
    });
    const t = setTimeout(() => setSlide(2), 300 + issues.length * 350 + 2000);
    return () => clearTimeout(t);
  }, [slide === 1 && cycle]);

  /* Slide 2: revenue → signal completion */
  useEffect(() => {
    if (slide !== 2) return;
    setTimeout(() => setRevenueVisible(true), 300);
    setTimeout(() => setBarWidths([75, 25]), 600);
    const t = setTimeout(() => onComplete?.(), 5000);
    return () => clearTimeout(t);
  }, [slide === 2 && cycle]);

  return (
    <div className={styles.darkCard} ref={cardRef}>
      <div className={styles.darkCardTitle}>See what you are missing.</div>
      <div className={styles.darkCardSubtitle}>
        Full audit of your registrations, statements, and collection status. Every gap, every error, every uncollected
        royalty surfaced in one place.
      </div>

      <div className={styles.slideContainer}>
        {/* ── Slide 0: Scanning ── */}
        <div className={`${styles.slide} ${slideClass(slide, 0)}`}>
          <div className={styles.scanRow}>
            <div className={`${styles.scanSpinner} ${active && slide === 0 ? styles.scanSpinnerActive : ''}`} />
            <div className={styles.scanRowText}>
              <div className={styles.scanRowTitle}>Scanning catalog...</div>
              <div className={styles.scanRowSub}>Checking {worksCount} works</div>
            </div>
            <div className={styles.scanPercent}>{percent}%</div>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>

        {/* ── Slide 1: Critical Issues ── */}
        <div className={`${styles.slide} ${slideClass(slide, 1)}`}>
          <div className={styles.issueHeader}>
            <div className={styles.issueHeaderIcon}>
              <FaTriangleExclamation size={16} />
            </div>
            <div className={styles.issueHeaderText}>
              <div className={styles.issueHeaderTitle}>Critical Issues</div>
              <div className={styles.issueHeaderSub}>4 items need attention</div>
            </div>
          </div>
          <div className={styles.issueList}>
            {issues.map((issue, i) => (
              <div key={i} className={`${styles.issueRow} ${visibleIssues.includes(i) ? styles.issueRowVisible : ''}`}>
                <div className={styles.issueBrandIcon} data-brand={issue.brand}>
                  <BrandIcon brand={issue.brand} />
                </div>
                <div className={styles.issueRowText}>
                  <div className={styles.issueRowTitle}>{issue.label}</div>
                  <div className={issue.sub.startsWith('$') ? styles.issueRowMoney : styles.issueRowSub}>
                    {issue.sub}
                  </div>
                </div>
                <div className={styles.issueTag}>{issue.tag}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Slide 2: Uncollected Royalties ── */}
        <div className={`${styles.slide} ${slideClass(slide, 2)}`}>
          <div className={styles.royaltyHeader}>
            <div className={styles.royaltyHeaderIcon}>
              <FaDollarSign size={16} />
            </div>
            <div className={styles.royaltyHeaderText}>
              <div className={styles.royaltyHeaderTitle}>Uncollected Royalties</div>
              <div className={styles.royaltyHeaderSub}>Ready to claim</div>
            </div>
          </div>

          <div className={`${styles.revenueCard} ${revenueVisible ? styles.revenueCardVisible : ''}`}>
            <div className={styles.revenueLabel}>Total Missing Revenue</div>
            <div className={styles.revenueAmount}>$5,090</div>
            <div className={styles.revenueRow}>
              <span className={styles.revenueRowLabel}>Streaming Royalties</span>
              <span className={styles.revenueRowValue}>$3,850</span>
            </div>
            <div className={styles.revenueBar}>
              <div className={styles.revenueBarFill} style={{ width: `${barWidths[0]}%` }} />
            </div>
            <div className={styles.revenueRow}>
              <span className={styles.revenueRowLabel}>Performance Rights</span>
              <span className={styles.revenueRowValue}>$1,240</span>
            </div>
            <div className={styles.revenueBar}>
              <div className={styles.revenueBarFill} style={{ width: `${barWidths[1]}%` }} />
            </div>
          </div>
          <div className={styles.royaltyFooter}>RD can help you collect this revenue automatically</div>
        </div>
      </div>

      <div className={styles.decorBlob} />

      <div className={styles.carouselDots}>
        <span className={slide === 0 ? styles.dotActive : styles.dot} />
        <span className={slide === 1 ? styles.dotActive : styles.dot} />
        <span className={slide === 2 ? styles.dotActive : styles.dot} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   REGISTRATION CARD  (Step 3)  –  3-slide carousel
   ═══════════════════════════════════════════ */
const works = [
  { title: 'Blinding Lights', writers: 'The Weeknd', art: '/The_Weeknd_-_Blinding_Lights.png' },
  { title: 'Levitating', writers: 'Dua Lipa', art: '/album-levitating.png' },
  { title: 'As It Was', writers: 'Harry Styles', art: '/album-as-it-was.png' },
];

const regChecklist = ['Work metadata', 'Writer & publisher info', 'Territory specifications', 'Rights allocation'];

const societies = [
  { code: 'US', name: 'ASCAP' },
  { code: 'UK', name: 'PRS' },
  { code: 'DE', name: 'GEMA' },
  { code: 'CA', name: 'SOCAN' },
];

function RegistrationCard({ active, onComplete }) {
  const cardRef = useRef(null);
  const [cycle, setCycle] = useState(0);
  const [slide, setSlide] = useState(0);

  /* slide 0 */
  const [selected, setSelected] = useState([]);
  /* slide 1 */
  const [submitPercent, setSubmitPercent] = useState(0);
  const [checkedItems, setCheckedItems] = useState([]);
  /* slide 2 */
  const [registeredSocieties, setRegisteredSocieties] = useState([]);

  const resetState = () => {
    setSelected([]);
    setSubmitPercent(0);
    setCheckedItems([]);
    setRegisteredSocieties([]);
  };

  /* Start a new cycle each time active transitions to true */
  const prevActive = useRef(false);
  useEffect(() => {
    if (active && !prevActive.current) {
      resetState();
      setSlide(0);
      setCycle((c) => c + 1);
    }
    prevActive.current = active;
  }, [active]);

  /* Slide 0: select works */
  useEffect(() => {
    if (cycle === 0 || slide !== 0) return;
    works.forEach((_, i) => {
      setTimeout(() => setSelected((s) => [...s, i]), 800 + i * 700);
    });
  }, [cycle]);

  /* Slide 0 → 1 */
  useEffect(() => {
    if (selected.length < works.length || slide !== 0) return;
    const t = setTimeout(() => setSlide(1), 1500);
    return () => clearTimeout(t);
  }, [selected.length, slide]);

  /* Slide 1: submit */
  useEffect(() => {
    if (slide !== 1) return;
    const duration = 3000;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.max(0, Math.min((now - t0) / duration, 1));
      setSubmitPercent(Math.round(p * 100));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    regChecklist.forEach((_, i) => {
      setTimeout(() => setCheckedItems((c) => [...c, i]), 600 + i * 650);
    });
  }, [slide === 1 && cycle]);

  /* Slide 1 → 2 */
  useEffect(() => {
    if (submitPercent < 100 || slide !== 1) return;
    const t = setTimeout(() => setSlide(2), 1500);
    return () => clearTimeout(t);
  }, [submitPercent, slide]);

  /* Slide 2: register societies → signal completion */
  useEffect(() => {
    if (slide !== 2) return;
    societies.forEach((_, i) => {
      setTimeout(() => setRegisteredSocieties((s) => [...s, i]), 500 + i * 700);
    });
    const t = setTimeout(() => onComplete?.(), 500 + societies.length * 700 + 3000);
    return () => clearTimeout(t);
  }, [slide === 2 && cycle]);

  const activeStep = slide >= 2 ? 2 : slide;

  return (
    <div className={styles.darkCard} ref={cardRef}>
      <div className={styles.darkCardTitle}>Take action or let us.</div>
      <div className={styles.darkCardSubtitle}>
        Streamlined registration across global collection societies. Submit once, register everywhere.
      </div>

      <div className={styles.darkCardBody}>
        {/* Step indicators */}
        <div className={styles.regSteps}>
          <div className={`${styles.regStep} ${activeStep === 0 ? styles.regStepActive : ''}`}>
            <div className={`${styles.regStepIcon} ${activeStep === 0 ? styles.regStepIconActive : ''}`}>
              <FaClipboardList size={16} />
            </div>
            <span>Select</span>
          </div>
          <div className={`${styles.regStep} ${activeStep === 1 ? styles.regStepActive : ''}`}>
            <div
              className={`${styles.regStepIcon} ${activeStep === 1 ? styles.regStepIconActive : ''} ${activeStep === 1 ? styles.regStepIconGreen : ''}`}
            >
              <FaCloudArrowUp size={16} />
            </div>
            <span>Submit</span>
          </div>
          <div className={`${styles.regStep} ${activeStep === 2 ? styles.regStepActive : ''}`}>
            <div
              className={`${styles.regStepIcon} ${activeStep === 2 ? styles.regStepIconActive : ''} ${activeStep === 2 ? styles.regStepIconGreen : ''}`}
            >
              <FaGlobe size={16} />
            </div>
            <span>Register</span>
          </div>
        </div>

        {/* Slide container */}
        <div className={styles.slideContainer}>
          {/* ── Slide 0: Select ── */}
          <div className={`${styles.slide} ${slideClass(slide, 0)}`}>
            <div className={styles.regPanel}>
              <div className={styles.regPanelHeader}>Select works to register</div>
              <div className={styles.regPanelCount}>
                {selected.length} of {works.length} selected
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFillBlue}
                  style={{ width: `${(selected.length / works.length) * 100}%` }}
                />
              </div>
            </div>
            <div className={styles.worksList}>
              {works.map((work, i) => (
                <div key={i} className={`${styles.workItem} ${selected.includes(i) ? styles.workItemSelected : ''}`}>
                  <img src={work.art} alt={work.title} className={styles.workArt} />
                  <div className={styles.workText}>
                    <div className={styles.workTitle}>{work.title}</div>
                    <div className={styles.workSub}>{work.writers}</div>
                  </div>
                  <div className={styles.workCopy}>
                    <MdContentCopy size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Slide 1: Submit ── */}
          <div className={`${styles.slide} ${slideClass(slide, 1)}`}>
            <div className={styles.submitRow}>
              <div className={styles.submitSpinner}>
                <LuRefreshCw size={18} className={styles.submitSpinnerIcon} />
              </div>
              <div className={styles.submitRowText}>
                <div className={styles.submitRowTitle}>Submitting registration data</div>
                <div className={styles.submitRowSub}>Processing metadata</div>
              </div>
              <div className={styles.submitPercent}>{submitPercent}%</div>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${submitPercent}%` }} />
            </div>
            <div className={styles.checklistLabel}>Preparing registrations for:</div>
            <div className={styles.checklist}>
              {regChecklist.map((label, i) => (
                <div key={i} className={styles.checklistItem}>
                  <span className={styles.checklistDot} />
                  <span className={styles.checklistText}>{label}</span>
                  <span
                    className={`${styles.checklistCheck} ${checkedItems.includes(i) ? styles.checklistCheckVisible : ''}`}
                  >
                    <FaCheck size={10} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Slide 2: Register ── */}
          <div className={`${styles.slide} ${slideClass(slide, 2)}`}>
            <div className={styles.registerHeader}>
              <div className={styles.registerHeaderIcon}>
                <img src="https://cdn-icons-png.flaticon.com/128/546/546310.png" alt="" width={16} height={16} />
              </div>
              <div className={styles.registerHeaderText}>
                <div className={styles.registerHeaderTitle}>Registering globally</div>
                <div className={styles.registerHeaderSub}>
                  {registeredSocieties.length} of {societies.length} societies
                </div>
              </div>
            </div>
            <div className={styles.societyList}>
              {societies.map((soc, i) => (
                <div
                  key={i}
                  className={`${styles.societyRow} ${registeredSocieties.includes(i) ? styles.societyRowDone : ''}`}
                >
                  <span className={styles.societyCode}>{soc.code}</span>
                  <div className={styles.societyText}>
                    <div className={styles.societyName}>{soc.name}</div>
                    <div className={styles.societySub}>
                      {registeredSocieties.includes(i) ? 'Registered' : 'Processing...'}
                    </div>
                  </div>
                  <div
                    className={`${styles.societyCheck} ${registeredSocieties.includes(i) ? styles.societyCheckDone : ''}`}
                  >
                    {registeredSocieties.includes(i) ? <FaCheck size={11} /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.decorBlobRight} />

      <div className={styles.carouselDots}>
        <span className={slide === 0 ? styles.dotActive : styles.dot} />
        <span className={slide === 1 ? styles.dotActive : styles.dot} />
        <span className={slide === 2 ? styles.dotActive : styles.dot} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════ */
const steps = ['01', '02', '03'];

/* Card 1 (iframe) cycle length: 3 slides × 5s each = 15s */
const IFRAME_CYCLE_MS = 15000;

export default function HowItWorks() {
  const [sectionRef, sectionVisible] = useInView(0.15);
  const [activeCard, setActiveCard] = useState(0);
  const iframeRef = useRef(null);
  const stepRefs = useRef([]);
  const [inViewNow, setInViewNow] = useState(false);

  /* Track ongoing visibility for auto-scroll (not one-shot) */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setInViewNow(entry.isIntersecting), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Send start/stop to iframe when activeCard changes */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => iframe.contentWindow?.postMessage(activeCard === 0 && sectionVisible ? 'start' : 'stop', '*');
    /* iframe may not be loaded yet — send on load too */
    if (iframe.contentDocument?.readyState === 'complete') {
      send();
    }
    iframe.addEventListener('load', send);
    return () => iframe.removeEventListener('load', send);
  }, [activeCard, sectionVisible]);

  /* Auto-scroll to active card only while section is on screen */
  useEffect(() => {
    const el = stepRefs.current[activeCard];
    if (!el || !inViewNow) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeCard, inViewNow]);

  /* Card 1 (iframe): advance after one full cycle */
  useEffect(() => {
    if (!sectionVisible || activeCard !== 0) return;
    const t = setTimeout(() => setActiveCard(1), IFRAME_CYCLE_MS);
    return () => clearTimeout(t);
  }, [sectionVisible, activeCard]);

  const advance = () => setActiveCard((c) => (c + 1) % 3);

  return (
    <section className={styles.section} ref={sectionRef}>
      <h2 className={styles.sectionTitle}>How it works.</h2>

      <div className={styles.stepsGrid}>
        {steps.map((step, i) => (
          <div
            key={i}
            ref={(el) => (stepRefs.current[i] = el)}
            className={`${styles.stepColumn} ${activeCard === i ? styles.stepColumnActive : styles.stepColumnDim}`}
          >
            <div className={styles.stepNumber}>{step}</div>
            {i === 0 && (
              <div className={styles.stepCard}>
                <div className={styles.iframeWrap}>
                  <iframe
                    ref={iframeRef}
                    src="/verax-card.html"
                    className={styles.cardIframe}
                    title="RD catalog card"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
            {i === 1 && (
              <div className={styles.stepCard}>
                <ScanCard active={activeCard === 1} onComplete={advance} />
              </div>
            )}
            {i === 2 && (
              <div className={styles.stepCard}>
                <RegistrationCard active={activeCard === 2} onComplete={advance} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
