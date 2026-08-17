/* eslint-env jest */
import axios from 'axios';
import {
  createUpload,
  uploadTuning,
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
  // The protocol is now: declare a manifest (no files) -> send batches ->
  // finalize, with the SERVER verifying completeness. A single request that
  // both creates the upload and carries files is what made a lost response
  // mint a duplicate upload holding hundreds of megabytes.
  const calls = () => axios.mock.calls.map(([c]) => c);

  it('opens the upload with a manifest and no files', async () => {
    const files = [new File(['a'], 'a.pdf'), new File(['b'], 'b.xlsx')];
    await createUpload(files);

    const open = calls()[0];
    expect(open.method).toBe('POST');
    expect(open.url).toBe(`${stripSlash(BASE)}/admin/statements/uploads?finalize=false`);
    expect(open.data).not.toBeInstanceOf(FormData);
    expect(open.data.files.map((f) => f.name)).toEqual(['a.pdf', 'b.xlsx']);
  });

  it('sends the files as batches and then finalizes', async () => {
    await createUpload([new File(['a'], 'a.pdf'), new File(['b'], 'b.xlsx')]);
    const urls = calls().map((c) => c.url.replace(stripSlash(BASE), ''));
    expect(urls[0]).toBe('/admin/statements/uploads?finalize=false');
    expect(urls).toContain('/admin/statements/uploads/undefined/files');
    expect(urls[urls.length - 1]).toBe('/admin/statements/uploads/undefined/finalize');
  });

  it('reports progress as batches land', async () => {
    const onProgress = jest.fn();
    await createUpload([new File(['a'], 'a.pdf')], onProgress);
    expect(onProgress).toHaveBeenCalled();
    const [pct, info] = onProgress.mock.calls[onProgress.mock.calls.length - 1];
    expect(pct).toBe(100);
    expect(info.totalFiles).toBe(1);
  });

  it('rejects duplicate filenames before sending anything', async () => {
    axios.mockClear();
    await expect(createUpload([new File(['a'], 'same.pdf'), new File(['b'], 'same.pdf')])).rejects.toThrow(
      /Duplicate filenames/
    );
    expect(axios).not.toHaveBeenCalled();
  });

  it('attaches the upload id to a failure so the transfer can be resumed', async () => {
    uploadTuning.backoffMs = [1, 1, 1]; // exercise the retry path without the real waits
    axios.mockReset();
    axios
      .mockResolvedValueOnce({ data: { upload_id: 42 } }) // open
      .mockRejectedValue({ response: { status: 500, data: {} } }); // every batch attempt

    await expect(createUpload([new File(['a'], 'a.pdf')])).rejects.toMatchObject({
      upload_id: 42,
      resumable: true,
    });
    // open + 4 attempts (1 initial + 3 retries)
    expect(axios).toHaveBeenCalledTimes(5);
    uploadTuning.backoffMs = [2000, 6000, 15000];
  });

  it('does not retry a permanent error', async () => {
    uploadTuning.backoffMs = [1, 1, 1];
    axios.mockReset();
    axios.mockResolvedValueOnce({ data: { upload_id: 7 } }).mockRejectedValue({ response: { status: 409, data: {} } });

    await expect(createUpload([new File(['a'], 'a.pdf')])).rejects.toMatchObject({ status: 409 });
    expect(axios).toHaveBeenCalledTimes(2); // open + one attempt, no retries
    uploadTuning.backoffMs = [2000, 6000, 15000];
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
