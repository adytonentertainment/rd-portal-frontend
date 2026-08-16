// Client-side mirror of the backend statement filename parser
// (verax_backend app/services/statement_ingest/filename_parser.py, PRD §2.3).
// Used only to PREVIEW the sort result (derived batches, writer count) in the
// upload UI — the server-side sort is authoritative.

// Account codes may carry a -New suffix (re-contracted writers, e.g.
// C00739-New); the code itself is strictly alphanumeric.
const STEM_RE =
  /^Ben_(PUB\d{2}[HQ]\d)_([A-Za-z0-9]+(?:-New)?)(?: - |_)(.+?)(?:\s*\((Mechanical Royalties|YouTube Publishing|Performance Royalties)\))?$/;

const ROYALTY_TYPE_TO_CATALOG = {
  'Mechanical Royalties': 'Mechanical',
  'YouTube Publishing': 'YouTube',
  'Performance Royalties': 'Performance',
};

// Account-code conventions for filenames without royalty-type parens.
// Order matters: CSJ/CPJ before the bare CS/C patterns.
const CODE_CATALOG_PATTERNS = [
  [/^(?:CSJ|JN)/, 'Mechanical'],
  [/^CPJ\d/, 'Performance'],
  [/^CS\d/, 'YouTube'],
  [/^C\d/, 'YouTube'],
];

const inferCatalogFromCode = (accountCode) => {
  const hit = CODE_CATALOG_PATTERNS.find(([pattern]) => pattern.test(accountCode));
  return hit ? hit[1] : null;
};

// Parse one statement filename; returns null for anything unrecognized.
export const parseStatementFilename = (filename) => {
  const name = filename.split('/').pop().split('\\').pop();
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0) return null;
  const fileKind = name.slice(dotIndex + 1).toLowerCase();
  if (fileKind !== 'pdf' && fileKind !== 'xlsx') return null;
  const match = STEM_RE.exec(name.slice(0, dotIndex));
  if (!match) return null;
  const [, periodCode, accountCode, displayName, royaltyType] = match;
  const catalog = (royaltyType && ROYALTY_TYPE_TO_CATALOG[royaltyType]) || inferCatalogFromCode(accountCode);
  return {
    periodCode,
    accountCode,
    displayName: displayName.trim(),
    catalog,
    fileKind,
  };
};

// Derive the batch grouping the server's sort stage will produce from a list
// of filenames: one statement per (period, account); one batch per
// (period, catalog). Returns { batches, writerCount, unrecognizedCount }.
export const deriveSortPreview = (filenames) => {
  const statements = new Map(); // "period|account" -> parsed
  let unrecognizedCount = 0;
  filenames.forEach((filename) => {
    const parsed = parseStatementFilename(filename);
    if (!parsed || !parsed.catalog) {
      unrecognizedCount += 1;
      return;
    }
    const key = `${parsed.periodCode}|${parsed.accountCode}`;
    if (!statements.has(key)) statements.set(key, parsed);
  });

  const batchCounts = new Map(); // "period|catalog" -> statement count
  const writers = new Set();
  statements.forEach((parsed) => {
    writers.add(parsed.accountCode);
    const key = `${parsed.periodCode}|${parsed.catalog}`;
    batchCounts.set(key, (batchCounts.get(key) || 0) + 1);
  });

  const batches = Array.from(batchCounts.entries())
    .map(([key, statementCount]) => {
      const [periodCode, catalog] = key.split('|');
      // PUB26H1 -> "YouTube 2026H1" (matches the backend batch label)
      return { periodCode, catalog, statementCount, label: `${catalog} 20${periodCode.slice(3)}` };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return { batches, writerCount: writers.size, unrecognizedCount };
};
