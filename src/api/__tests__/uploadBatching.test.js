/* eslint-env jest */
import { buildBatches } from '../statementsAdmin';

// The corpus this has to survive: 5,224 statement files, 2.08 GB, median
// 0.12 MB with a 77 MB outlier. Fixed 250-file batching produced requests from
// 51 MB to 316 MB — the 316 MB one is in the production server log.
const mkFile = (name, size) => ({ name, size });

const corpus = () => {
  const files = [];
  // shape approximating the real distribution
  for (let i = 0; i < 4200; i += 1) files.push(mkFile(`small_${i}.xlsx`, 120_000));
  for (let i = 0; i < 900; i += 1) files.push(mkFile(`mid_${i}.pdf`, 1_340_000));
  for (let i = 0; i < 123; i += 1) files.push(mkFile(`big_${i}.xlsx`, 5_000_000));
  files.push(mkFile('Regalias Digitales, LLC (YouTube Publishing).xlsx', 77_430_000));
  return files;
};

const bytesOf = (b) => b.reduce((n, f) => n + f.size, 0);

describe('upload batching', () => {
  it('loses no file and preserves order', () => {
    const all = corpus();
    const flat = buildBatches(all).flat();
    expect(flat).toHaveLength(all.length);
    expect(flat.map((f) => f.name)).toEqual(all.map((f) => f.name));
  });

  it('keeps every batch under the target unless it is a single oversized file', () => {
    buildBatches(corpus()).forEach((b) => {
      if (b.length > 1) expect(bytesOf(b)).toBeLessThanOrEqual(24_000_000);
    });
  });

  it('puts an oversized file in a batch of its own', () => {
    const solo = buildBatches(corpus()).filter((b) => bytesOf(b) > 24_000_000);
    expect(solo).toHaveLength(1);
    expect(solo[0]).toHaveLength(1);
    expect(solo[0][0].size).toBe(77_430_000);
  });

  it('caps files per batch so tiny files do not make a 5,000-part request', () => {
    buildBatches(corpus()).forEach((b) => expect(b.length).toBeLessThanOrEqual(150));
  });

  it('produces far smaller worst-case requests than fixed 250-file batching', () => {
    const all = corpus();
    const fixed = [];
    for (let i = 0; i < all.length; i += 250) fixed.push(all.slice(i, i + 250));
    const worstFixed = Math.max(...fixed.map(bytesOf));
    const worstNew = Math.max(
      ...buildBatches(all)
        .filter((b) => b.length > 1)
        .map(bytesOf)
    );
    expect(worstFixed).toBeGreaterThan(100_000_000);
    expect(worstNew).toBeLessThanOrEqual(24_000_000);
  });

  it('handles an empty list and a single file', () => {
    expect(buildBatches([])).toEqual([]);
    expect(buildBatches([mkFile('a.xlsx', 10)])).toHaveLength(1);
  });
});
