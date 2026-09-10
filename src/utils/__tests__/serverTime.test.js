import { parseServerTime } from '../serverTime';

describe('parseServerTime', () => {
  it('reads a naive server timestamp as UTC, not as local time', () => {
    // The exact bug: an admin at UTC+2 saw every server time as 2h old, so a
    // transfer that had just started reported "nothing received for 120 min".
    const d = parseServerTime('2026-09-10T14:15:41.887504');
    expect(d.toISOString()).toBe('2026-09-10T14:15:41.887Z');
  });

  it('leaves a timestamp that already carries Z alone', () => {
    expect(parseServerTime('2026-09-10T14:15:41Z').toISOString()).toBe('2026-09-10T14:15:41.000Z');
  });

  it('leaves an explicit offset alone', () => {
    expect(parseServerTime('2026-09-10T16:15:41+02:00').toISOString()).toBe('2026-09-10T14:15:41.000Z');
  });

  it('a freshly stamped server time reads as roughly now, not hours ago', () => {
    const naive = new Date().toISOString().replace(/Z$/, '');
    const ageMs = Date.now() - parseServerTime(naive).getTime();
    expect(Math.abs(ageMs)).toBeLessThan(5000);
  });

  it('returns null for missing or unparseable input', () => {
    expect(parseServerTime(null)).toBeNull();
    expect(parseServerTime('')).toBeNull();
    expect(parseServerTime('not a date')).toBeNull();
  });
});
