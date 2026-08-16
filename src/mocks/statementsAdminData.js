// Mock admin statements data
// Sources: BMI, ASCAP, PRS, GEMA, MLC, Spotify, YouTube, Apple Music

const SOURCES = ['BMI', 'ASCAP', 'PRS', 'GEMA', 'MLC', 'Spotify', 'YouTube', 'Apple Music'];

// Generate mock statements spanning 12 months
const generateStatements = () => {
  const statements = [
    {
      id: 'stmt-001',
      source: 'BMI',
      periodLabel: 'Q4 2025',
      uploadedAt: '2026-04-15T14:32:00Z',
      status: 'approved',
      totalReported: 18420.5,
      totalMatched: 17842.1,
      transactionCount: 1247,
    },
    {
      id: 'stmt-002',
      source: 'Spotify',
      periodLabel: 'Mar 2026',
      uploadedAt: '2026-04-02T09:18:00Z',
      status: 'distributed',
      totalReported: 2367.9,
      totalMatched: 2312.4,
      transactionCount: 842,
    },
    {
      id: 'stmt-003',
      source: 'PRS',
      periodLabel: 'Q4 2025',
      uploadedAt: '2026-03-28T11:45:00Z',
      status: 'staged',
      totalReported: 4218.3,
      totalMatched: 3912.6,
      transactionCount: 623,
    },
    {
      id: 'stmt-004',
      source: 'YouTube',
      periodLabel: 'Q1 2026',
      uploadedAt: '2026-03-12T16:22:00Z',
      status: 'parsing',
      totalReported: 1816.4,
      totalMatched: 0,
      transactionCount: 0,
    },
    {
      id: 'stmt-005',
      source: 'GEMA',
      periodLabel: 'Q3 2025',
      uploadedAt: '2026-02-20T08:55:00Z',
      status: 'distributed',
      totalReported: 3144.1,
      totalMatched: 3018.7,
      transactionCount: 412,
    },
    {
      id: 'stmt-006',
      source: 'Apple Music',
      periodLabel: 'Jan 2026',
      uploadedAt: '2026-02-04T13:10:00Z',
      status: 'approved',
      totalReported: 918.6,
      totalMatched: 904.2,
      transactionCount: 318,
    },
    {
      id: 'stmt-007',
      source: 'ASCAP',
      periodLabel: 'Q3 2025',
      uploadedAt: '2026-01-22T10:30:00Z',
      status: 'distributed',
      totalReported: 12480.2,
      totalMatched: 12124.8,
      transactionCount: 1842,
    },
    {
      id: 'stmt-008',
      source: 'MLC',
      periodLabel: 'Q4 2025',
      uploadedAt: '2026-01-15T15:42:00Z',
      status: 'errored',
      totalReported: 0,
      totalMatched: 0,
      transactionCount: 0,
    },
    {
      id: 'stmt-009',
      source: 'BMI',
      periodLabel: 'Q3 2025',
      uploadedAt: '2025-12-18T09:20:00Z',
      status: 'distributed',
      totalReported: 16842.3,
      totalMatched: 16412.9,
      transactionCount: 1124,
    },
    {
      id: 'stmt-010',
      source: 'Spotify',
      periodLabel: 'Nov 2025',
      uploadedAt: '2025-12-04T14:15:00Z',
      status: 'distributed',
      totalReported: 1942.6,
      totalMatched: 1918.4,
      transactionCount: 712,
    },
    {
      id: 'stmt-011',
      source: 'YouTube',
      periodLabel: 'Q4 2025',
      uploadedAt: '2025-11-22T11:30:00Z',
      status: 'distributed',
      totalReported: 2418.7,
      totalMatched: 2312.1,
      transactionCount: 518,
    },
    {
      id: 'stmt-012',
      source: 'ASCAP',
      periodLabel: 'Q2 2025',
      uploadedAt: '2025-10-15T08:45:00Z',
      status: 'distributed',
      totalReported: 11248.4,
      totalMatched: 10982.1,
      transactionCount: 1642,
    },
  ];

  return statements;
};

// Module-level mutable array for demo purposes
let _statements = generateStatements();

/**
 * Get all admin statements
 * @returns {Array} Array of statement objects
 */
export const getAdminStatements = () => {
  return [..._statements];
};

/**
 * Get a single statement by ID
 * @param {string} id - Statement ID
 * @returns {Object|undefined} Statement object or undefined
 */
export const getStatementById = (id) => {
  return _statements.find((s) => s.id === id);
};

/**
 * Add a new statement (for upload flow)
 * @param {Object} stmt - Statement object
 */
export const addStatement = (stmt) => {
  _statements = [stmt, ..._statements];
};

/**
 * Update a statement's status
 * @param {string} id - Statement ID
 * @param {string} status - New status
 */
export const updateStatementStatus = (id, status) => {
  _statements = _statements.map((s) => (s.id === id ? { ...s, status } : s));
};

/**
 * Generate a new statement ID
 * @returns {string} New unique ID
 */
export const generateStatementId = () => {
  const maxId = _statements.reduce((max, s) => {
    const num = parseInt(s.id.replace('stmt-', ''), 10);
    return num > max ? num : max;
  }, 0);
  return `stmt-${String(maxId + 1).padStart(3, '0')}`;
};

export { SOURCES };

// Distribution periods mock data
const FEE_RATE = 0.2; // 20% admin fee

const generateDistributionPeriods = () => {
  return [
    {
      id: 'dist-q1-2026',
      periodLabel: 'Q1 2026',
      totalGross: 24810.4,
      feeRate: FEE_RATE,
      fees: 4962.08,
      totalNet: 19848.32,
      status: 'open',
      distributedAt: null,
    },
    {
      id: 'dist-q4-2025',
      periodLabel: 'Q4 2025',
      totalGross: 31248.6,
      feeRate: FEE_RATE,
      fees: 6249.72,
      totalNet: 24998.88,
      status: 'closed',
      distributedAt: '2026-01-15T10:30:00Z',
    },
    {
      id: 'dist-q3-2025',
      periodLabel: 'Q3 2025',
      totalGross: 28420.2,
      feeRate: FEE_RATE,
      fees: 5684.04,
      totalNet: 22736.16,
      status: 'closed',
      distributedAt: '2025-10-12T14:20:00Z',
    },
    {
      id: 'dist-q2-2025',
      periodLabel: 'Q2 2025',
      totalGross: 22680.5,
      feeRate: FEE_RATE,
      fees: 4536.1,
      totalNet: 18144.4,
      status: 'closed',
      distributedAt: '2025-07-18T09:45:00Z',
    },
    {
      id: 'dist-q1-2025',
      periodLabel: 'Q1 2025',
      totalGross: 19420.8,
      feeRate: FEE_RATE,
      fees: 3884.16,
      totalNet: 15536.64,
      status: 'closed',
      distributedAt: '2025-04-10T11:00:00Z',
    },
    {
      id: 'dist-q4-2024',
      periodLabel: 'Q4 2024',
      totalGross: 26180.3,
      feeRate: FEE_RATE,
      fees: 5236.06,
      totalNet: 20944.24,
      status: 'closed',
      distributedAt: '2025-01-08T16:30:00Z',
    },
  ];
};

let _distributionPeriods = generateDistributionPeriods();

/**
 * Get all distribution periods
 * @returns {Array} Array of distribution period objects
 */
export const getDistributionPeriods = () => {
  return [..._distributionPeriods];
};

/**
 * Get a single distribution period by ID
 * @param {string} id - Period ID
 * @returns {Object|undefined} Period object or undefined
 */
export const getDistributionPeriodById = (id) => {
  return _distributionPeriods.find((p) => p.id === id);
};

/**
 * Mark a distribution period as closed
 * @param {string} id - Period ID
 */
export const closeDistributionPeriod = (id) => {
  _distributionPeriods = _distributionPeriods.map((p) =>
    p.id === id ? { ...p, status: 'closed', distributedAt: new Date().toISOString() } : p
  );
};
