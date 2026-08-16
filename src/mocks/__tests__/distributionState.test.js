/* eslint-env jest */
import {
  getDocStatus,
  getWriterDetail,
  ingestUpload,
  markStatementReceived,
  markStatementMissing,
  normalizeReceipt,
  CURRENT_PERIOD,
  REQUIRED_STATEMENT_TYPES,
} from '../distributionState';

const [MECH, YT] = REQUIRED_STATEMENT_TYPES; // ['Mechanical Royalties', 'YouTube Publishing']
const WRITER = -5; // RedZed (seeded)

// Start each test from a clean receipt state for the writer under test.
const resetWriter = (id = WRITER) => {
  for (const t of REQUIRED_STATEMENT_TYPES) markStatementMissing(id, t, 'both');
};

beforeEach(() => resetWriter());

const ingest = (type, fileKind, totalAmount = 0, lines = 0) =>
  ingestUpload({ writerId: WRITER, statementType: type, period: CURRENT_PERIOD, fileKind, totalAmount, lines });

describe('completeness: per-type XLSX + one master summary PDF', () => {
  it('a type is received when its XLSX is in, but the writer completes only with the summary PDF', () => {
    ingest(MECH, 'xlsx');
    ingest(YT, 'xlsx');
    let doc = getDocStatus(WRITER);
    expect(doc.items.every((i) => i.received)).toBe(true); // both XLSX in
    expect(doc.summaryPdf).toBe(false);
    expect(doc.complete).toBe(false);
    expect(doc.missing).toEqual(['Summary PDF']);

    ingest(YT, 'pdf'); // the single summary PDF
    doc = getDocStatus(WRITER);
    expect(doc.summaryPdf).toBe(true);
    expect(doc.complete).toBe(true);
  });

  it('the summary PDF is ONE field, not per type — any PDF upload satisfies it', () => {
    ingest(MECH, 'xlsx');
    ingest(YT, 'xlsx');
    // a PDF uploaded under the Mechanical type still completes the single summary
    ingest(MECH, 'pdf');
    const doc = getDocStatus(WRITER);
    expect(doc.summaryPdf).toBe(true);
    expect(doc.complete).toBe(true);
  });

  it('names outstanding items: per-type XLSX and the single Summary PDF', () => {
    ingest(MECH, 'xlsx'); // only Mechanical XLSX in
    const doc = getDocStatus(WRITER);
    expect(doc.missingXlsx).toBe(1); // YT xlsx
    expect(doc.missingSummaryPdf).toBe(1);
    expect(doc.missing).toEqual(['YouTube Publishing (XLSX)', 'Summary PDF']);
    expect(doc.anyReceived).toBe(true);
  });
});

describe('money is counted once (xlsx only)', () => {
  it('the summary PDF adds no pending $', () => {
    const before = getWriterDetail(WRITER).pending;
    ingest(YT, 'xlsx', 100, 10);
    const afterXlsx = getWriterDetail(WRITER).pending;
    expect(afterXlsx - before).toBe(100);

    ingest(YT, 'pdf', 999); // even a non-zero amount must not add money
    expect(getWriterDetail(WRITER).pending).toBe(afterXlsx);
  });
});

describe('markStatement kind semantics', () => {
  it("'xlsx' marks a type's detail; 'pdf' marks the writer's single summary", () => {
    markStatementReceived(WRITER, MECH, 'xlsx');
    let doc = getDocStatus(WRITER);
    expect(doc.items.find((i) => i.source === MECH).xlsx).toBe(true);
    expect(doc.summaryPdf).toBe(false);

    markStatementReceived(WRITER, MECH, 'pdf');
    expect(getDocStatus(WRITER).summaryPdf).toBe(true);

    markStatementMissing(WRITER, MECH, 'pdf');
    expect(getDocStatus(WRITER).summaryPdf).toBe(false);
  });
});

describe('legacy snapshot migration', () => {
  it('oldest array-of-strings → all XLSX + summary PDF in', () => {
    expect(normalizeReceipt(['Mechanical Royalties'])).toEqual({
      xlsx: { 'Mechanical Royalties': true },
      summaryPdf: true,
    });
  });

  it('prior per-type {xlsx,pdf} pairs collapse the PDF into one summary', () => {
    expect(
      normalizeReceipt({
        'Mechanical Royalties': { xlsx: true, pdf: false },
        'YouTube Publishing': { xlsx: true, pdf: true },
      })
    ).toEqual({
      xlsx: { 'Mechanical Royalties': true, 'YouTube Publishing': true },
      summaryPdf: true, // any per-type pdf → the single summary
    });
  });

  it('current shape passes through; garbage → empty', () => {
    expect(normalizeReceipt({ xlsx: { X: true }, summaryPdf: false })).toEqual({
      xlsx: { X: true },
      summaryPdf: false,
    });
    expect(normalizeReceipt(undefined)).toEqual({ xlsx: {}, summaryPdf: false });
  });
});
