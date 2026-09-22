/**
 * Money must render identically for every viewer.
 *
 * The bug these pin: amounts were formatted with a bare `.toLocaleString()`,
 * which follows the VIEWER's locale. The same Canada figure rendered as
 * "341,871" in the US, "341 871" in Czechia and "341.871" in Germany — and a
 * reader whose convention says comma-is-the-decimal-point reads "341,871" as
 * about three hundred forty-one dollars rather than three hundred forty-one
 * thousand. A 1000x misreading of a royalty figure, caused purely by who
 * opened the page.
 *
 * Statements are denominated in USD, so the digits are a property of the
 * money, not of the reader. These tests fail if that ever stops being true.
 */

import { formatCurrency } from '../currencyFormatter';

describe('formatCurrency is locale-independent', () => {
  // The real figures from the Top 10 Countries panel that prompted this.
  const CASES = [
    [101866392, '$101,866,392'],
    [341871, '$341,871'],
    [56333, '$56,333'],
    [15059, '$15,059'],
    [6503, '$6,503'],
  ];

  it.each(CASES)('formats %p as %p', (value, expected) => {
    expect(formatCurrency(value)).toBe(expected);
  });

  it('does not follow the ambient locale', () => {
    // A bare toLocaleString would change with this; formatCurrency must not.
    const bare = (341871).toLocaleString();
    const pinned = formatCurrency(341871);
    expect(pinned).toBe('$341,871');
    // Documents the hazard rather than asserting the host's locale: wherever
    // the two disagree, the pinned one is the one users must see.
    expect(pinned).toBe(`$${(341871).toLocaleString('en-US')}`);
    expect(typeof bare).toBe('string');
  });

  it('never renders money with three decimal places', () => {
    // "$6.503" is what a bare toLocaleString produced for a sub-$1000 amount:
    // three decimals on a dollar figure, which is exactly where a grouping
    // separator becomes indistinguishable from a decimal point.
    for (const v of [6.503, 341.871, 56.333, 15.059]) {
      const out = formatCurrency(v);
      const decimals = (out.split('.')[1] || '').replace(/\D/g, '');
      expect(decimals.length).toBeLessThanOrEqual(2);
    }
    expect(formatCurrency(6.503)).toBe('$6.50');
  });

  it('keeps thousands and decimals unambiguous at both magnitudes', () => {
    // The pair that must never look alike: ~$341 and ~$341,871.
    expect(formatCurrency(341.871)).toBe('$341.87');
    expect(formatCurrency(341871)).toBe('$341,871');
    expect(formatCurrency(341.871)).not.toBe(formatCurrency(341871));
  });
});
