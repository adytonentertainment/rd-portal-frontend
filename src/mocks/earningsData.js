import { MOCK_WRITERS } from './roster';

// Per-writer earnings, last 12 months (most-recent month last).
// Monthly $ totals chosen to roughly average the writer's profile, with seasonal jitter.
// Months map to: Jun '25 → May '26 (today: 2026-05-05)
const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

const profile = (avg, jitter, drift = 0) =>
  MONTHS.map((m, i) => ({
    month: m,
    amount: Math.round(avg + Math.sin(i / 2.2) * jitter + i * drift + (Math.random() - 0.5) * jitter * 0.6),
  }));

// Earnings split per writer (rough $ totals over 12 months).
// Sources: Performance (PRO), Streaming, Sync, Mechanical
// Territories: US, UK, DE, FR, AU, CA, BR, Other
const WRITER_EARNINGS = {
  // Demo Writer — most active, headline writer
  '-1': {
    monthly: profile(2900, 720, 90),
    totalUsages: 2_410_000,
    worksCount: 47,
    bySource: { Performance: 18400, Streaming: 11200, Sync: 6200, Mechanical: 1800 },
    byTerritory: { US: 14800, UK: 6200, DE: 4400, FR: 3100, AU: 2200, CA: 1800, BR: 1100, Other: 4000 },
    topWorks: [
      { title: 'Lantern Light', amount: 9420.5, plays: 142500 },
      { title: 'Coastline Drive', amount: 6731.2, plays: 92300 },
      { title: 'Hours Like These', amount: 4988.4, plays: 71200 },
      { title: 'Slow Tide', amount: 3742.1, plays: 41600 },
      { title: 'Open Window', amount: 2671.3, plays: 28100 },
    ],
    statements: [
      { date: '2026-04-15', source: 'BMI', period: 'Q4 2025', amount: 4218.4 },
      { date: '2026-04-02', source: 'Spotify', period: 'Mar 2026', amount: 1124.6 },
      { date: '2026-03-28', source: 'PRS', period: 'Q4 2025', amount: 612.1 },
      { date: '2026-03-12', source: 'YouTube CMS', period: 'Q1 2026', amount: 482.9 },
      { date: '2026-02-20', source: 'GEMA', period: 'Q3 2025', amount: 731.5 },
      { date: '2026-02-04', source: 'Apple Music', period: 'Jan 2026', amount: 318.8 },
      { date: '2026-01-22', source: 'ASCAP', period: 'Q3 2025', amount: 0 },
    ],
  },
  // Ava Brooks — emerging, smaller but growing
  '-2': {
    monthly: profile(960, 280, 35),
    totalUsages: 720_000,
    worksCount: 18,
    bySource: { Performance: 5200, Streaming: 4100, Sync: 1200, Mechanical: 720 },
    byTerritory: { US: 4900, UK: 1800, DE: 1100, FR: 700, AU: 600, CA: 520, BR: 280, Other: 1320 },
    topWorks: [
      { title: 'Garden in May', amount: 3812.4, plays: 51200 },
      { title: 'Telephone Wires', amount: 2541.8, plays: 38400 },
      { title: 'Saturday Letters', amount: 1876.0, plays: 26800 },
      { title: 'Thirteen', amount: 991.3, plays: 14100 },
    ],
    statements: [
      { date: '2026-04-15', source: 'BMI', period: 'Q4 2025', amount: 1248.2 },
      { date: '2026-04-02', source: 'Spotify', period: 'Mar 2026', amount: 412.3 },
      { date: '2026-03-12', source: 'YouTube CMS', period: 'Q1 2026', amount: 184.7 },
      { date: '2026-02-04', source: 'Apple Music', period: 'Jan 2026', amount: 132.6 },
    ],
  },
  // M. Okonkwo — compact catalog, modest earnings
  '-3': {
    monthly: profile(420, 140, 12),
    totalUsages: 295_000,
    worksCount: 9,
    bySource: { Performance: 2100, Streaming: 1900, Sync: 480, Mechanical: 320 },
    byTerritory: { US: 1800, UK: 740, DE: 510, FR: 360, AU: 280, CA: 240, BR: 110, Other: 760 },
    topWorks: [
      { title: 'Eastlake', amount: 1842.9, plays: 28100 },
      { title: 'Iron Sky', amount: 1218.4, plays: 17600 },
      { title: 'Open Window', amount: 982.1, plays: 12200 }, // collab with Demo Writer
    ],
    statements: [
      { date: '2026-04-15', source: 'BMI', period: 'Q4 2025', amount: 612.4 },
      { date: '2026-04-02', source: 'Spotify', period: 'Mar 2026', amount: 218.1 },
      { date: '2026-03-12', source: 'YouTube CMS', period: 'Q1 2026', amount: 84.6 },
    ],
  },
  // Night Static — streaming-heavy act, mechanical + YouTube statements (fictional)
  '-5': {
    monthly: profile(2300, 520, 35),
    totalUsages: 38_400_000,
    worksCount: 6,
    bySource: { Performance: 6400, Streaming: 17800, Sync: 0, Mechanical: 3100 },
    byTerritory: { US: 12100, MX: 3900, ES: 2600, DE: 1900, CO: 1500, AR: 1100, BR: 900, Other: 3300 },
    topWorks: [
      { title: 'Low Signal', amount: 6840.2, plays: 9_100_000 },
      { title: 'Glass Hour', amount: 4912.5, plays: 6_600_000 },
      { title: 'Northbound', amount: 3705.8, plays: 5_000_000 },
      { title: 'Paper Saints', amount: 2618.4, plays: 3_500_000 },
      { title: 'Afterimage', amount: 1904.1, plays: 2_600_000 },
      { title: 'Slow Burn City', amount: 1288.6, plays: 1_700_000 },
    ],
    statements: [
      { date: '2026-04-22', source: 'Mechanical Royalties', period: 'H2 2025', amount: 9214.4 },
      { date: '2026-04-22', source: 'YouTube Publishing', period: 'H2 2025', amount: 2186.9 },
    ],
  },
  // The Vine Sessions — mid-tier band, sync-heavy
  '-4': {
    monthly: profile(1480, 360, 60),
    totalUsages: 1_180_000,
    worksCount: 24,
    bySource: { Performance: 7200, Streaming: 5100, Sync: 4800, Mechanical: 920 },
    byTerritory: { US: 7400, UK: 3100, DE: 2200, FR: 1500, AU: 1100, CA: 920, BR: 540, Other: 1240 },
    topWorks: [
      { title: 'Cathedral', amount: 5128.4, plays: 71200 },
      { title: 'Marrow', amount: 4014.8, plays: 56300 },
      { title: 'Hours Like These', amount: 2884.6, plays: 38700 }, // collab with Demo Writer
      { title: 'Ride Out', amount: 2018.2, plays: 28100 },
    ],
    statements: [
      { date: '2026-04-15', source: 'BMI', period: 'Q4 2025', amount: 1814.4 },
      { date: '2026-04-02', source: 'Spotify', period: 'Mar 2026', amount: 612.8 },
      { date: '2026-03-28', source: 'PRS', period: 'Q4 2025', amount: 318.4 },
      { date: '2026-03-12', source: 'YouTube CMS', period: 'Q1 2026', amount: 248.6 },
      { date: '2026-02-20', source: 'GEMA', period: 'Q3 2025', amount: 412.1 },
    ],
  },
};

const sumBy = (objs, key) => objs.reduce((acc, o) => acc + (o[key] || 0), 0);

const aggregateMonthly = (writers) =>
  MONTHS.map((m, i) => ({
    month: m,
    amount: writers.reduce((acc, w) => acc + (w.monthly[i]?.amount || 0), 0),
  }));

const mergeBuckets = (writers, key) => {
  const out = {};
  for (const w of writers) {
    for (const [k, v] of Object.entries(w[key] || {})) {
      out[k] = (out[k] || 0) + v;
    }
  }
  return out;
};

const mergeTopWorks = (writers, limit = 6) => {
  const merged = {};
  for (const w of writers) {
    for (const work of w.topWorks) {
      if (!merged[work.title]) merged[work.title] = { ...work };
      else {
        merged[work.title].amount += work.amount;
        merged[work.title].plays += work.plays;
      }
    }
  }
  return Object.values(merged)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

const mergeStatements = (writers) => {
  const all = writers.flatMap((w) => w.statements);
  return all.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
};

// Stable profiles to map any unknown writer id to one of these archetypes.
// We hash the id so the same client always gets the same archetype across reloads.
const ARCHETYPE_KEYS = ['-1', '-2', '-3', '-4'];

const archetypeForId = (id) => {
  // Deterministic mapping from any number/string id → one of the four archetype keys.
  const n = Math.abs(typeof id === 'number' ? id : Number(id) || 0);
  return ARCHETYPE_KEYS[n % ARCHETYPE_KEYS.length];
};

// ── Per-writer earnings overrides for dynamically-created writers ──────────
// When a writer is auto-created via upload and gets statements ingested, we store
// their running totals here so their portal reflects actual ingested amounts
// rather than falling back to archetype data.
const writerEarningsOverrides = new Map();

export const recordWriterEarnings = (writerId, { amount, source, period }) => {
  const key = String(writerId);
  if (!writerEarningsOverrides.has(key)) {
    writerEarningsOverrides.set(key, {
      totalAmount: 0,
      bySource: {},
      periods: new Set(),
    });
  }
  const entry = writerEarningsOverrides.get(key);
  entry.totalAmount += amount;
  entry.bySource[source] = (entry.bySource[source] || 0) + amount;
  entry.periods.add(period);
};

export const getWriterEarningsOverride = (writerId) => {
  return writerEarningsOverrides.get(String(writerId)) || null;
};

// A seeded mock writer still counts only while it remains in the live roster.
// Deleting a writer (distributionState.removeWriter) splices MOCK_WRITERS, so
// this drops them from both per-writer lookups and the publisher aggregate.
const writerExists = (id) => MOCK_WRITERS.some((w) => w.id === Number(id));

export const getEarningsForClient = (clientId, clientName) => {
  if (clientId == null) {
    // Publisher Account: aggregate all mock writers still on the roster.
    const all = Object.entries(WRITER_EARNINGS)
      .filter(([k]) => writerExists(k))
      .map(([, v]) => v);
    return {
      writerName: 'Publisher Account',
      monthly: aggregateMonthly(all),
      bySource: mergeBuckets(all, 'bySource'),
      byTerritory: mergeBuckets(all, 'byTerritory'),
      topWorks: mergeTopWorks(all),
      statements: mergeStatements(all),
    };
  }
  // A deleted mock writer (negative id no longer on the roster) has no data —
  // covers a seeded writer and any auto-created writer once it has been removed.
  if (Number(clientId) < 0 && !writerExists(clientId)) return null;
  // Direct mock match (negative-id mocks)
  let data = WRITER_EARNINGS[String(clientId)];

  // Check for override data from ingested uploads (dynamically created writers)
  const override = getWriterEarningsOverride(clientId);
  if (!data && override) {
    // Build a lightweight profile from the ingested totals
    const writer = MOCK_WRITERS.find((w) => w.id === Number(clientId));
    const total = override.totalAmount;
    // Distribute the total across 12 months with most in H2 2025 (indices 1-6)
    const monthly = MONTHS.map((m, i) => {
      // H2 2025 gets ~90% of the total, spread across Jul-Dec (indices 1-6)
      if (i >= 1 && i <= 6) {
        return { month: m, amount: Math.round((total * 0.9) / 6) };
      }
      // Remaining months get small amounts
      return { month: m, amount: Math.round((total * 0.1) / 6) };
    });
    return {
      writerName: clientName || writer?.name || 'Writer',
      monthly,
      bySource: override.bySource,
      byTerritory: { US: Math.round(total * 0.5), Other: Math.round(total * 0.5) },
      topWorks: [],
      statements: [],
    };
  }

  // Real backend client (positive id, no direct match) → reuse one of the archetype profiles.
  if (!data) data = WRITER_EARNINGS[archetypeForId(clientId)];
  const writer = MOCK_WRITERS.find((w) => w.id === Number(clientId));
  return {
    writerName: clientName || writer?.name || 'Writer',
    monthly: data.monthly,
    bySource: data.bySource,
    byTerritory: data.byTerritory,
    topWorks: data.topWorks,
    statements: data.statements,
  };
};

export const totalForPeriod = (monthly, n = 3) => monthly.slice(-n).reduce((s, m) => s + m.amount, 0);

// Resolve any client id (real or mock) to one of the four mock archetype profiles.
const resolveProfile = (clientId) => {
  let data = WRITER_EARNINGS[String(clientId)];
  if (!data) data = WRITER_EARNINGS[archetypeForId(clientId)];
  return data;
};

// Total usage events (streams + broadcasts + live + sync placements) for the timeframe.
// monthsBack=12 → full annual figure; smaller windows scale proportionally.
export const getTotalUsages = (clientId, monthsBack = 12) => {
  if (clientId == null) {
    const total = Object.entries(WRITER_EARNINGS)
      .filter(([k]) => writerExists(k))
      .reduce((s, [, w]) => s + (w.totalUsages || 0), 0);
    return Math.round((total * monthsBack) / 12);
  }
  const profile = resolveProfile(clientId);
  return Math.round(((profile?.totalUsages || 0) * monthsBack) / 12);
};

// Total works in the writer's catalog (publisher view sums across writers).
export const getWorksCount = (clientId) => {
  if (clientId == null) {
    return Object.entries(WRITER_EARNINGS)
      .filter(([k]) => writerExists(k))
      .reduce((s, [, w]) => s + (w.worksCount || 0), 0);
  }
  const profile = resolveProfile(clientId);
  return profile?.worksCount || 0;
};

// ───────────────────────────────────────────────────────────────────────────
// Transaction-level mock data for the Revenue page
// ───────────────────────────────────────────────────────────────────────────

// Deterministic PRNG so each writer gets stable mock data across reloads
const seededRand = (seed) => {
  let s =
    (typeof seed === 'number'
      ? seed
      : seed
          .toString()
          .split('')
          .reduce((a, c) => a + c.charCodeAt(0), 0)) || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

// Mapping of high-level source bucket → realistic platforms + organizations
const SOURCE_DETAILS = {
  Performance: {
    incomeName: 'Performance',
    platforms: ['BMI', 'ASCAP', 'PRS', 'GEMA', 'SACEM', 'APRA', 'SOCAN'],
    organizations: ['BMI', 'ASCAP', 'PRS for Music', 'GEMA', 'SACEM', 'APRA AMCOS', 'SOCAN'],
  },
  Streaming: {
    incomeName: 'Streaming',
    platforms: ['Spotify', 'Apple Music', 'YouTube', 'Amazon Music', 'Tidal', 'Deezer'],
    organizations: ['MLC', 'Harry Fox', 'Spotify', 'Apple Music', 'YouTube CMS'],
  },
  Sync: {
    incomeName: 'Sync',
    platforms: ['Sync Licensing', 'TV Broadcast', 'Film', 'Advertising'],
    organizations: ['Direct License', 'Music Sales Sync', 'Sub-publisher Sync'],
  },
  Mechanical: {
    incomeName: 'Mechanical',
    platforms: ['MLC', 'Harry Fox', 'CMRRA', 'MCPS'],
    organizations: ['MLC', 'Harry Fox', 'CMRRA', 'MCPS'],
  },
};

const TERRITORY_NAMES = {
  US: 'United States',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  AU: 'Australia',
  CA: 'Canada',
  BR: 'Brazil',
  JP: 'Japan',
  NL: 'Netherlands',
  SE: 'Sweden',
  ES: 'Spain',
  IT: 'Italy',
  MX: 'Mexico',
  Other: 'Other',
};

// Map our internal "UK" key to ISO "GB" so mapping/territory aggregation works
const territoryCode = (key) => (key === 'UK' ? 'GB' : key);

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

const isoFor = (title) => {
  // Synthesize a stable-ish ISRC from the title so the catalog dedups consistently
  const hash = title
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .padEnd(10, 'X')
    .slice(0, 10);
  return `US${hash.slice(0, 3)}${hash.slice(3, 8)}`;
};

// Produce ~N transactions per writer, distributed by bySource weights and byTerritory weights.
// Each transaction is one (catalog item × territory × platform × month) line item.
const buildTransactions = (writerKey, profileData, writerName) => {
  const rand = seededRand(writerKey);
  const totalsBySource = profileData.bySource;
  const totalsByTerritory = profileData.byTerritory;
  const works = profileData.topWorks;
  // Optional per-writer override of platforms/organizations (e.g., a writer paid through ICE/APRA/etc.)
  const sourceDetailsOverride = profileData.sourceDetails || {};

  // Weight catalog items by their amount so top earners get more line items.
  const totalWorkAmount = works.reduce((s, w) => s + w.amount, 0);
  const workWeights = works.map((w) => ({ ...w, weight: w.amount / totalWorkAmount }));
  const territoryEntries = Object.entries(totalsByTerritory);
  const totalTerritoryAmount = territoryEntries.reduce((s, [, v]) => s + v, 0);

  const transactions = [];
  let txId = 1;

  // For each source, generate enough line items to roughly sum to the target
  for (const [src, srcTotal] of Object.entries(totalsBySource)) {
    const detail = sourceDetailsOverride[src] || SOURCE_DETAILS[src];
    if (!detail || srcTotal <= 0) continue;

    // Number of line items: more for streaming/performance (granular), fewer for sync (chunky)
    const txCount =
      src === 'Sync'
        ? 4 + Math.floor(rand() * 3)
        : src === 'Mechanical'
          ? 8 + Math.floor(rand() * 4)
          : 22 + Math.floor(rand() * 14);

    let allocated = 0;
    for (let i = 0; i < txCount; i++) {
      const isLast = i === txCount - 1;
      // Weighted random work selection
      let r = rand();
      let chosenWork = workWeights[0];
      for (const w of workWeights) {
        if (r < w.weight) {
          chosenWork = w;
          break;
        }
        r -= w.weight;
      }

      // Weighted random territory selection
      let tR = rand() * totalTerritoryAmount;
      let chosenTerritory = territoryEntries[0][0];
      for (const [key, val] of territoryEntries) {
        if (tR < val) {
          chosenTerritory = key;
          break;
        }
        tR -= val;
      }

      const platform = pick(rand, detail.platforms);
      const organization = pick(rand, detail.organizations);

      // All synthesized transactions for the demo belong to the H2 2025 reporting
      // period (the most recent closed half-year). Date is distributed within
      // H2 2025 (Jul 1 → Dec 31, 2025) for realism in the transactions table.
      const dayOffset = Math.floor(rand() * 184); // 184 days in Jul–Dec 2025
      const d = new Date('2025-07-01T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + dayOffset);

      // Amount: spread the source total across the count, with jitter; on the last one, top up to target.
      const baseShare = srcTotal / txCount;
      const amount = isLast ? Math.max(0.1, srcTotal - allocated) : Math.max(0.5, baseShare * (0.5 + rand() * 1.0));
      allocated += amount;

      const half = d.getUTCMonth() < 6 ? 1 : 2;
      const period = `H${half} ${d.getUTCFullYear()}`;

      transactions.push({
        id: `tx-${writerKey}-${txId++}`,
        amount: Math.round(amount * 100) / 100,
        product: chosenWork.title,
        title: chosenWork.title,
        artist: writerName,
        isrc: isoFor(chosenWork.title),
        date: d.toISOString().slice(0, 10),
        period,
        territory: territoryCode(chosenTerritory),
        territoryName: TERRITORY_NAMES[chosenTerritory] || chosenTerritory,
        platform,
        source: platform,
        incomeName: detail.incomeName,
        category: detail.incomeName,
        sourceCategory: detail.incomeName,
        organization,
      });
    }
  }
  // Sort by date desc for nicer display
  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return transactions;
};

const buildStatements = (writerKey, profileData) =>
  profileData.statements.map((s, i) => ({
    id: `stmt-${writerKey}-${i + 1}`,
    filename: `${s.source.replace(/\s+/g, '_')}_${s.period.replace(/\s+/g, '_')}.csv`,
    uploadDate: s.date,
    transactionCount: 8 + i * 3,
    totalAmount: s.amount,
    organization: s.source,
    period: s.period,
  }));

export const getTransactionsForClient = (clientId, clientName) => {
  // A deleted mock writer (negative id no longer on the roster) has no data.
  if (Number(clientId) < 0 && !writerExists(clientId)) return [];

  // Resolve to the same archetype the chart panels use
  let key = String(clientId);
  let data = WRITER_EARNINGS[key];
  if (clientId == null) {
    // Publisher Account: combine all writers' transactions, attributed to their writer name.
    return Object.entries(WRITER_EARNINGS).flatMap(([k, p]) => {
      if (!writerExists(k)) return []; // skip writers removed from the roster
      const w = MOCK_WRITERS.find((mw) => mw.id === Number(k));
      return buildTransactions(k, p, w?.name || 'Writer');
    });
  }
  if (!data) {
    key = archetypeForId(clientId);
    data = WRITER_EARNINGS[key];
  }
  const writer = MOCK_WRITERS.find((w) => w.id === clientId);
  const name = clientName || writer?.name || 'Writer';
  return buildTransactions(key, data, name);
};

export const getStatementsForClient = (clientId) => {
  if (clientId == null) {
    return Object.entries(WRITER_EARNINGS)
      .filter(([k]) => writerExists(k))
      .flatMap(([k, p]) => buildStatements(k, p));
  }
  // A deleted mock writer (negative id no longer on the roster) has no data.
  if (Number(clientId) < 0 && !writerExists(clientId)) return [];
  let key = String(clientId);
  let data = WRITER_EARNINGS[key];
  if (!data) {
    key = archetypeForId(clientId);
    data = WRITER_EARNINGS[key];
  }
  return buildStatements(key, data);
};
