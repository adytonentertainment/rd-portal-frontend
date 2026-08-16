import { useEffect, useRef, useState } from 'react';
import { FaRegCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './quarterRangePicker.module.css';

// "2025-Q4" → chronological ordinal so quarters compare/iterate cleanly.
const ord = (q) => {
  const m = /^(\d{4})-Q([1-4])$/.exec(q || '');
  return m ? Number(m[1]) * 4 + (Number(m[2]) - 1) : null;
};
const keyOf = (year, q) => `${year}-Q${q}`;
const label = (q) => {
  const m = /^(\d{4})-Q([1-4])$/.exec(q || '');
  return m ? `Q${m[2]} ${m[1]}` : '—';
};

// Calendar-style popup for picking a quarter range. The user clicks a start
// quarter then an end quarter; quarters outside the data range are fully
// selectable. `onChange(from, to)` fires with ordered quarter keys.
const QuarterRangePicker = ({ from, to, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState(null);
  const [hoverQ, setHoverQ] = useState(null);
  const baseYear = Number(/(\d{4})/.exec(from || to || '')?.[1]) || new Date().getFullYear();
  const [startYear, setStartYear] = useState(baseYear - 2);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setPendingFrom(null);
        setHoverQ(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const years = [0, 1, 2, 3, 4].map((i) => startYear + i);

  const pick = (q) => {
    if (!pendingFrom) {
      setPendingFrom(q);
      setHoverQ(q);
      return;
    }
    const a = ord(pendingFrom);
    const b = ord(q);
    const lo = a <= b ? pendingFrom : q;
    const hi = a <= b ? q : pendingFrom;
    onChange(lo, hi);
    setPendingFrom(null);
    setHoverQ(null);
    setOpen(false);
  };

  // Highlight band: the in-progress [pendingFrom, hover] selection, else [from, to].
  let rangeLo = null;
  let rangeHi = null;
  if (pendingFrom) {
    const a = ord(pendingFrom);
    const b = ord(hoverQ || pendingFrom);
    rangeLo = Math.min(a, b);
    rangeHi = Math.max(a, b);
  } else if (from && to) {
    rangeLo = Math.min(ord(from), ord(to));
    rangeHi = Math.max(ord(from), ord(to));
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((o) => !o)}>
        <FaRegCalendarAlt size={12} />
        <span>{from && to ? `${label(from)} – ${label(to)}` : 'Select range'}</span>
      </button>

      {open && (
        <div className={styles.popup}>
          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={() => setStartYear((y) => y - 1)}>
              <FaChevronLeft size={10} />
            </button>
            <span className={styles.headerTitle}>
              {pendingFrom ? `${label(pendingFrom)}  →  pick end quarter` : 'Pick a start & end quarter'}
            </span>
            <button type="button" className={styles.navBtn} onClick={() => setStartYear((y) => y + 1)}>
              <FaChevronRight size={10} />
            </button>
          </div>

          <div className={styles.grid}>
            {years.map((year) => (
              <div key={year} className={styles.yearRow}>
                <span className={styles.yearLabel}>{year}</span>
                <div className={styles.quarters}>
                  {[1, 2, 3, 4].map((q) => {
                    const k = keyOf(year, q);
                    const o = ord(k);
                    const inRange = rangeLo != null && o >= rangeLo && o <= rangeHi;
                    const isEnd = o === rangeLo || o === rangeHi;
                    return (
                      <button
                        key={q}
                        type="button"
                        className={`${styles.qCell} ${inRange ? styles.qInRange : ''} ${isEnd ? styles.qEnd : ''}`}
                        onClick={() => pick(k)}
                        onMouseEnter={() => pendingFrom && setHoverQ(k)}
                      >
                        Q{q}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            {from && to ? `Showing ${label(from)} – ${label(to)}` : 'No range selected'}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuarterRangePicker;
