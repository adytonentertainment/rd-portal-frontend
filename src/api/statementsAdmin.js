import axios from 'axios';

// API client for the statement-ingestion backend (PRD §9, Phase-1 subset).
// Every function resolves with the response body, or rejects with a
// normalized error object { status, message, detail } — never a raw axios
// error. status === 0 means the backend was unreachable.

const baseUrl = () => (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizeError = (error) => {
  const response = error && error.response;
  if (response) {
    const data = response.data;
    let message;
    if (typeof data === 'string' && data) message = data;
    else if (data && typeof data.message === 'string') message = data.message;
    else if (data && typeof data.detail === 'string') message = data.detail;
    else message = (error && error.message) || 'Request failed';
    return { status: response.status, message, detail: data ?? null };
  }
  return {
    status: 0,
    message: 'Backend unreachable',
    detail: (error && error.message) || null,
  };
};

const request = async (config) => {
  try {
    const response = await axios({
      ...config,
      url: `${baseUrl()}${config.url}`,
      headers: { accept: 'application/json', ...authHeaders(), ...(config.headers || {}) },
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

// Files per request. A real drop is ~5,200 files / ~2 GB; sending that as one
// body invites proxy timeouts and means a single dropped connection loses the
// whole transfer. Batching keeps each request small and independently
// retryable — the server writes files by name, so re-sending a failed batch
// overwrites rather than duplicates.
const UPLOAD_BATCH_SIZE = 250;

const postBatch = (url, batch) => {
  const form = new FormData();
  batch.forEach((file) => form.append('files', file, file.name));
  return request({ url, method: 'POST', data: form });
};

// POST /admin/statements/uploads — dump many loose files (multipart).
// Sent in batches: the first opens the upload, the rest are appended, then it
// is finalized to release it to the ingest worker.
// onProgress(percent) is called as batches land.
export const createUpload = async (files, onProgress) => {
  const all = Array.from(files);
  if (!all.length) throw new Error('No files selected');

  const batches = [];
  for (let i = 0; i < all.length; i += UPLOAD_BATCH_SIZE) {
    batches.push(all.slice(i, i + UPLOAD_BATCH_SIZE));
  }

  const report = (done) => {
    if (onProgress) onProgress(Math.round((done / all.length) * 100));
  };

  // One batch, retried once — a transient failure shouldn't lose the transfer.
  const send = async (url, batch) => {
    try {
      return await postBatch(url, batch);
    } catch (err) {
      if (err?.status === 409) throw err; // upload already processing: don't retry
      return postBatch(url, batch);
    }
  };

  const first = await send('/admin/statements/uploads?finalize=false', batches[0]);
  const uploadId = first.upload_id;
  let sent = batches[0].length;
  report(sent);

  for (const batch of batches.slice(1)) {
    await send(`/admin/statements/uploads/${uploadId}/files`, batch);
    sent += batch.length;
    report(sent);
  }

  const finalized = await request({
    url: `/admin/statements/uploads/${uploadId}/finalize`,
    method: 'POST',
  });
  report(all.length);
  return { ...finalized, upload_id: uploadId };
};

export const getUpload = (id) => request({ url: `/admin/statements/uploads/${id}` });

// Real parsed figures (sum of line earnings) per statement an upload produced,
// so the upload UI shows true amounts instead of a size-based estimate.
export const getUploadStatements = (id) => request({ url: `/admin/statements/uploads/${id}/statements` });

export const listBatches = (params = {}) => request({ url: '/admin/statements/batches', params });

export const getBatch = (id) => request({ url: `/admin/statements/batches/${id}` });

export const listFindings = (batchId, params = {}) =>
  request({ url: `/admin/statements/batches/${batchId}/findings`, params });

export const waiveFinding = (id, reason) =>
  request({ url: `/admin/findings/${id}/waive`, method: 'POST', data: { reason } });

export const acknowledgeFinding = (id) => request({ url: `/admin/findings/${id}/acknowledge`, method: 'POST' });

// GET /admin/distributions/periods — real per-period rollup (statement count,
// total net payable to writers, distribution status/date). Net only.
export const listDistributionPeriods = () => request({ url: '/admin/distributions/periods' });

// GET /admin/statements/reconcile — ingestion audit: proves the DB matches the
// statement-filename ground truth (identity + ownership). ok=false blocks sending.
export const getIngestionAudit = () => request({ url: '/admin/statements/reconcile' });

export const listBatchStatements = (batchId, params = {}) =>
  request({ url: `/admin/statements/batches/${batchId}/statements`, params });

export const getStatement = (id) => request({ url: `/admin/statements/${id}` });

export const getStatementLines = (id, page = 1, pageSize = 50) =>
  request({
    url: `/admin/statements/${id}/lines`,
    params: { page, page_size: pageSize },
  });

export const revalidateBatch = (batchId) =>
  request({ url: `/admin/statements/batches/${batchId}/revalidate`, method: 'POST' });
