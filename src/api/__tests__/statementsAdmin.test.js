/* eslint-env jest */
import axios from 'axios';
import {
  createUpload,
  getUpload,
  getUploadStatements,
  listBatches,
  getBatch,
  listFindings,
  waiveFinding,
  acknowledgeFinding,
  listBatchStatements,
  getStatement,
  getStatementLines,
  revalidateBatch,
  normalizeError,
} from '../statementsAdmin';

jest.mock('axios', () => ({ __esModule: true, default: jest.fn() }));

const BASE = process.env.REACT_APP_BACKEND_URL || '';
const stripSlash = (url) => url.replace(/\/+$/, '');

beforeEach(() => {
  axios.mockReset();
  axios.mockResolvedValue({ data: { ok: true } });
  localStorage.setItem('token', 'test-token');
});

afterEach(() => {
  localStorage.clear();
});

const lastConfig = () => axios.mock.calls[axios.mock.calls.length - 1][0];

describe('statementsAdmin URL + method mapping', () => {
  it.each([
    [() => getUpload(7), 'GET', '/admin/statements/uploads/7'],
    [() => getUploadStatements(7), 'GET', '/admin/statements/uploads/7/statements'],
    [() => listBatches(), 'GET', '/admin/statements/batches'],
    [() => getBatch(3), 'GET', '/admin/statements/batches/3'],
    [() => listFindings(3), 'GET', '/admin/statements/batches/3/findings'],
    [() => acknowledgeFinding(9), 'POST', '/admin/findings/9/acknowledge'],
    [() => listBatchStatements(3), 'GET', '/admin/statements/batches/3/statements'],
    [() => getStatement(11), 'GET', '/admin/statements/11'],
    [() => revalidateBatch(3), 'POST', '/admin/statements/batches/3/revalidate'],
  ])('maps to %s %s', async (call, method, path) => {
    await call();
    const config = lastConfig();
    expect(config.url).toBe(`${stripSlash(BASE)}${path}`);
    expect(config.method || 'GET').toBe(method);
  });

  it('attaches the bearer token from localStorage', async () => {
    await listBatches();
    expect(lastConfig().headers.Authorization).toBe('Bearer test-token');
  });

  it('resolves with the response body', async () => {
    axios.mockResolvedValue({ data: { items: [1, 2] } });
    await expect(listBatches()).resolves.toEqual({ items: [1, 2] });
  });
});

describe('createUpload', () => {
  it('posts multipart FormData with all files and reports progress', async () => {
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' }), new File(['b'], 'b.xlsx')];
    const onProgress = jest.fn();
    await createUpload(files, onProgress);

    const config = lastConfig();
    expect(config.method).toBe('POST');
    expect(config.url).toBe(`${stripSlash(BASE)}/admin/statements/uploads`);
    expect(config.data).toBeInstanceOf(FormData);
    expect(config.data.getAll('files')).toHaveLength(2);

    config.onUploadProgress({ loaded: 50, total: 200 });
    expect(onProgress).toHaveBeenCalledWith(25, { loaded: 50, total: 200 });
  });

  it('does not call onProgress when total is unknown', async () => {
    const onProgress = jest.fn();
    await createUpload([new File(['a'], 'a.pdf')], onProgress);
    lastConfig().onUploadProgress({ loaded: 50 });
    expect(onProgress).not.toHaveBeenCalled();
  });
});

describe('waiveFinding / getStatementLines params', () => {
  it('posts the waive reason as JSON body', async () => {
    await waiveFinding(4, 'known rounding diff');
    const config = lastConfig();
    expect(config.method).toBe('POST');
    expect(config.url).toBe(`${stripSlash(BASE)}/admin/findings/4/waive`);
    expect(config.data).toEqual({ reason: 'known rounding diff' });
  });

  it('passes pagination as page/page_size with a default size of 50', async () => {
    await getStatementLines(8, 3);
    expect(lastConfig().params).toEqual({ page: 3, page_size: 50 });
  });
});

describe('error normalization', () => {
  it('normalizes HTTP errors to {status, message, detail}', async () => {
    axios.mockRejectedValue({
      response: { status: 422, data: { detail: 'invalid period' } },
      message: 'Request failed with status code 422',
    });
    await expect(getBatch(1)).rejects.toEqual({
      status: 422,
      message: 'invalid period',
      detail: { detail: 'invalid period' },
    });
  });

  it('normalizes network errors to status 0 / Backend unreachable', async () => {
    axios.mockRejectedValue({ message: 'Network Error' });
    await expect(listBatches()).rejects.toEqual({
      status: 0,
      message: 'Backend unreachable',
      detail: 'Network Error',
    });
  });

  it('falls back to the axios message when the body has no usable text', async () => {
    expect(normalizeError({ response: { status: 500, data: { weird: true } }, message: 'boom' })).toEqual({
      status: 500,
      message: 'boom',
      detail: { weird: true },
    });
  });
});
