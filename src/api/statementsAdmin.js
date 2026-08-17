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

// --- statement upload ---------------------------------------------------
//
// A real drop is ~5,224 files / 2.08 GB. Three properties matter, in order:
//
//   1. A partial drop must never be ingested as a complete royalty period.
//      The client declares a manifest up front and the SERVER refuses to
//      finalize until every declared file is present at its declared size.
//   2. An interruption must be recoverable. The upload id survives every
//      failure path so the transfer resumes instead of restarting 2 GB.
//   3. No single request should be enormous. Batching by file COUNT produced
//      requests from 51 MB to 316 MB against this corpus (median file 0.12 MB,
//      max 77 MB), each minutes long on the wire and re-sent whole on retry.

const TARGET_BATCH_BYTES = 24_000_000; // ~90 batches for 2.08 GB
const MAX_BATCH_FILES = 150; // guard against a long run of tiny files
const PART_OVERHEAD = 220; // multipart headers per part, approx

// No bytes acknowledged for this long means the connection is dead, not slow.
// A total timeout is the wrong control: 24 MB is legitimately slow on a poor
// link, but it is never silent.
const STALL_MS = 45_000;
const HARD_CAP_MS = 600_000;

const RETRYABLE = (status) => status === 0 || status === 408 || status === 429 || (status >= 500 && status < 600);
// Exported so tests can exercise the retry path without waiting 23 real
// seconds. These are the production values.
export const uploadTuning = { backoffMs: [2000, 6000, 15000] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pack by bytes, not count. A file larger than the target lands in its own
// batch — there is no intra-file chunking in this protocol.
export const buildBatches = (all) => {
  const batches = [];
  let cur = [];
  let bytes = 0;
  for (const f of all) {
    const weight = (f.size || 0) + PART_OVERHEAD + (f.name || '').length;
    if (cur.length && (bytes + weight > TARGET_BATCH_BYTES || cur.length >= MAX_BATCH_FILES)) {
      batches.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(f);
    bytes += weight;
    if (bytes >= TARGET_BATCH_BYTES || cur.length >= MAX_BATCH_FILES) {
      batches.push(cur);
      cur = [];
      bytes = 0;
    }
  }
  if (cur.length) batches.push(cur);
  return batches;
};

const postBatch = (url, batch, onBytes) => {
  const form = new FormData();
  batch.forEach((file) => form.append('files', file, file.name));
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), STALL_MS);
  return request({
    url,
    method: 'POST',
    data: form,
    signal: controller.signal,
    timeout: HARD_CAP_MS,
    onUploadProgress: (event) => {
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), STALL_MS);
      if (onBytes) onBytes(event.loaded, event.total);
    },
  }).finally(() => clearTimeout(timer));
};

// Retry only what is worth retrying. The previous version retried once,
// immediately and unconditionally — which re-sent 300 MB straight back into a
// restarting server, and pointlessly retried 404s and 409s that can never
// succeed.
const send = async (url, batch, onBytes) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return batch === null
        ? await request({ url, method: 'POST', timeout: 60_000 })
        : await postBatch(url, batch, onBytes);
    } catch (err) {
      const status = err?.status;
      const backoff = uploadTuning.backoffMs;
      if (!RETRYABLE(status) || attempt >= backoff.length) throw err;
      const base = backoff[attempt];
      await sleep(base * (0.8 + Math.random() * 0.4)); // jitter
    }
  }
};

const preflight = (all) => {
  const seen = new Set();
  const dupes = [];
  all.forEach((f) => {
    if (seen.has(f.name)) dupes.push(f.name);
    seen.add(f.name);
  });
  if (dupes.length) {
    throw new Error(
      `Duplicate filenames would overwrite each other: ${dupes.slice(0, 5).join(', ')}` +
        (dupes.length > 5 ? ` (+${dupes.length - 5} more)` : '')
    );
  }
};

// POST /admin/statements/uploads — dump many loose files (multipart).
// onProgress(percent, {sentFiles, totalFiles, uploadId}) as batches land.
export const createUpload = async (files, onProgress, opts = {}) => {
  const all = Array.from(files);
  if (!all.length) throw new Error('No files selected');
  preflight(all);

  const batches = buildBatches(all);
  let uploadId = opts.resumeUploadId;

  if (!uploadId) {
    // Deliberately NOT retried and carries no files: this is the only
    // non-idempotent call, so a lost response must cost an empty row, not a
    // duplicate upload holding hundreds of megabytes nobody can find.
    const opened = await request({
      url: '/admin/statements/uploads?finalize=false',
      method: 'POST',
      data: { files: all.map((f) => ({ name: f.name, size: f.size })) },
      timeout: 60_000,
    });
    uploadId = opened.upload_id;
  }

  let sent = 0;
  const report = () => {
    if (onProgress) {
      onProgress(Math.round((sent / all.length) * 100), {
        sentFiles: sent,
        totalFiles: all.length,
        uploadId,
      });
    }
  };
  report();

  try {
    for (const batch of batches) {
      await send(`/admin/statements/uploads/${uploadId}/files`, batch);
      sent += batch.length;
      report();
    }
  } catch (err) {
    // The id is the whole incident: without it the transfer cannot be resumed
    // and gigabytes sit stranded on the server with nobody able to name them.
    err.upload_id = uploadId;
    err.resumable = true;
    throw err;
  }

  // Always attempted, and retried like any other call. The server verifies the
  // manifest and returns 409 with the missing list if anything is short.
  const finalized = await send(`/admin/statements/uploads/${uploadId}/finalize`, null);
  return { ...finalized, upload_id: uploadId };
};

// Re-send only what the server says is missing, then finalize.
export const resumeUpload = async (uploadId, files, onProgress) => {
  const missing = await request({ url: `/admin/statements/uploads/${uploadId}/missing` });
  const wanted = new Set([...(missing.missing || []), ...(missing.short || []).map((s) => s.name)]);
  const outstanding = Array.from(files).filter((f) => wanted.has(f.name));
  if (!outstanding.length) {
    const finalized = await send(`/admin/statements/uploads/${uploadId}/finalize`, null);
    return { ...finalized, upload_id: uploadId };
  }
  return createUpload(outstanding, onProgress, { resumeUploadId: uploadId });
};

export const listUploads = (params = {}) => request({ url: '/admin/statements/uploads', params });

export const getUploadMissing = (id) => request({ url: `/admin/statements/uploads/${id}/missing` });

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
