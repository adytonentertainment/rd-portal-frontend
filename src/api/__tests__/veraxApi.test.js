/* eslint-env jest */
import axios from 'axios';
import {
  uploadClientList,
  getClientImport,
  getResolutionQueue,
  resolveQueueRow,
  applyClientImport,
} from '../clientImportAdmin';
import { getBatchGate, distributeBatch, unpublishDistribution } from '../distributionAdmin';
import {
  getMe,
  listMyWriters,
  listWriterMembers,
  shareWriterAccess,
  revokeMyInvite,
  listMyStatements,
  getMyStatement,
  getMyStatementBreakdown,
  downloadMyStatementPdf,
  adminInviteToWriter,
  adminListWriterInvites,
  previewInvite,
  acceptInvite,
} from '../portal';
import { normalizeError } from '../client';

jest.mock('axios', () => ({ __esModule: true, default: jest.fn() }));

const BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

beforeEach(() => {
  axios.mockReset();
  axios.mockResolvedValue({ data: { ok: true } });
  localStorage.setItem('token', 'test-token');
});
afterEach(() => localStorage.clear());

const last = () => axios.mock.calls[axios.mock.calls.length - 1][0];

describe('URL + method mapping', () => {
  it.each([
    [() => getClientImport(5), 'GET', '/admin/client-imports/5'],
    [() => getResolutionQueue(5, 'unmatched'), 'GET', '/admin/client-imports/5/queue'],
    [() => getBatchGate(3), 'GET', '/admin/statements/batches/3/gate'],
    [() => distributeBatch(3), 'POST', '/admin/statements/batches/3/distribute'],
    [() => unpublishDistribution(9), 'POST', '/admin/distributions/9/unpublish'],
    [() => getMe(), 'GET', '/me'],
    [() => listMyWriters(), 'GET', '/me/writers'],
    [() => listWriterMembers(2), 'GET', '/me/writers/2/members'],
    [() => shareWriterAccess(2, 'a@b.com'), 'POST', '/me/writers/2/invites'],
    [() => revokeMyInvite(4), 'POST', '/me/invites/4/revoke'],
    [() => listMyStatements(), 'GET', '/me/statements'],
    [() => getMyStatement(7), 'GET', '/me/statements/7'],
    [() => getMyStatementBreakdown(7), 'GET', '/me/statements/7/breakdown'],
    [() => downloadMyStatementPdf(7), 'GET', '/me/statements/7/pdf'],
    [() => adminInviteToWriter(2, 'a@b.com'), 'POST', '/admin/writers/2/invites'],
    [() => adminListWriterInvites(2), 'GET', '/admin/writers/2/invites'],
    [() => previewInvite('tok'), 'GET', '/portal/invites/tok'],
    [() => acceptInvite('tok', 'pw'), 'POST', '/portal/accept-invite'],
  ])('maps %#', async (call, method, path) => {
    await call();
    const cfg = last();
    // GET has no explicit method in axios config; others set it.
    expect((cfg.method || 'GET').toUpperCase()).toBe(method);
    expect(cfg.url).toBe(`${BASE}${path}`);
    expect(cfg.headers.Authorization).toBe('Bearer test-token');
  });
});

describe('request bodies + params', () => {
  it('resolveQueueRow sends snake_case body', async () => {
    await resolveQueueRow(5, { sheet: 'Client List', rowNo: 12, accountCodes: ['C00901'] });
    expect(last().data).toEqual({
      sheet: 'Client List',
      row_no: 12,
      account_codes: ['C00901'],
    });
  });

  it('getResolutionQueue passes the kind param', async () => {
    await getResolutionQueue(5, 'probable');
    expect(last().params).toEqual({ kind: 'probable' });
  });

  it('shareWriterAccess sends email + role', async () => {
    await shareWriterAccess(2, 'mgr@x.com', 'legal');
    expect(last().data).toEqual({ email: 'mgr@x.com', role: 'legal' });
  });

  it('listMyStatements narrows by writer_id when given', async () => {
    await listMyStatements(42);
    expect(last().params).toEqual({ writer_id: 42 });
  });

  it('uploadClientList posts multipart FormData', async () => {
    const file = new File(['x'], 'Client List.xlsx');
    await uploadClientList(file);
    expect(last().data).toBeInstanceOf(FormData);
    expect(last().url).toBe(`${BASE}/admin/client-imports`);
  });

  it('applyClientImport re-sends the file as FormData', async () => {
    const file = new File(['x'], 'Client List.xlsx');
    await applyClientImport(5, file);
    expect(last().data).toBeInstanceOf(FormData);
    expect(last().url).toBe(`${BASE}/admin/client-imports/5/apply`);
  });

  it('downloadMyStatementPdf requests a blob', async () => {
    await downloadMyStatementPdf(7);
    expect(last().responseType).toBe('blob');
  });
});

describe('normalizeError', () => {
  it('extracts detail string from a response', () => {
    const e = normalizeError({ response: { status: 409, data: { detail: 'gate not ready' } } });
    expect(e).toEqual({ status: 409, message: 'gate not ready', detail: { detail: 'gate not ready' } });
  });
  it('reports unreachable backend as status 0', () => {
    const e = normalizeError({ message: 'Network Error' });
    expect(e.status).toBe(0);
    expect(e.message).toBe('Backend unreachable');
  });
});
