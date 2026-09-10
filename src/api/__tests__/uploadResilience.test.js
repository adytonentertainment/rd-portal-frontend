import { uploadTuning } from '../statementsAdmin';

// A 5,000-file transfer runs for many minutes. The things that interrupt it are
// ordinary — a deploy restarting the API, a network blip — and giving up after
// ~23 seconds meant the whole upload died with thousands of files still to send.
describe('upload retry budget', () => {
  it('retries a batch long enough to ride out a transient failure', () => {
    const total = uploadTuning.backoffMs.reduce((a, b) => a + b, 0);
    expect(uploadTuning.backoffMs.length).toBeGreaterThanOrEqual(5);
    // Retries only ever run when something has already failed, so patience is
    // free in the normal case. At 8 MB a batch, re-sending one is cheap.
    expect(total).toBeGreaterThanOrEqual(100_000);
  });

  it('backs off progressively rather than hammering', () => {
    const b = uploadTuning.backoffMs;
    for (let i = 1; i < b.length; i += 1) {
      expect(b[i]).toBeGreaterThan(b[i - 1]);
    }
    expect(b[0]).toBeGreaterThanOrEqual(1000);
  });
});

describe('runLanes — parallel batch transfer', () => {
  const { runLanes } = require('../statementsAdmin');

  it('sends every batch exactly once', async () => {
    const batches = Array.from({ length: 37 }, (_, i) => [i]);
    const seen = [];
    await runLanes(batches, async (b) => { seen.push(b[0]); }, 4);
    expect(seen.sort((a, z) => a - z)).toEqual(batches.map((b) => b[0]));
  });

  it('actually overlaps work rather than running end to end', async () => {
    let inFlight = 0;
    let peak = 0;
    const batches = Array.from({ length: 12 }, (_, i) => [i]);
    await runLanes(
      batches,
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
      },
      4
    );
    expect(peak).toBe(4);
  });

  it('never exceeds the lane width', async () => {
    let inFlight = 0;
    let peak = 0;
    const batches = Array.from({ length: 30 }, (_, i) => [i]);
    await runLanes(
      batches,
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 1));
        inFlight -= 1;
      },
      3
    );
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('stops feeding lanes once a batch fails, and reports that failure', async () => {
    const attempted = [];
    const boom = new Error('connection lost');
    await expect(
      runLanes(
        Array.from({ length: 40 }, (_, i) => [i]),
        async (b) => {
          attempted.push(b[0]);
          await new Promise((r) => setTimeout(r, 1));
          if (b[0] === 2) throw boom;
        },
        4
      )
    ).rejects.toThrow('connection lost');
    // The lanes wind down instead of pushing all 40 into a broken connection.
    expect(attempted.length).toBeLessThan(40);
  });

  it('handles fewer batches than lanes', async () => {
    const seen = [];
    await runLanes([[1], [2]], async (b) => { seen.push(b[0]); }, 8);
    expect(seen.sort()).toEqual([1, 2]);
  });

  it('handles an empty batch list', async () => {
    await expect(runLanes([], async () => {}, 4)).resolves.toBeUndefined();
  });
});
