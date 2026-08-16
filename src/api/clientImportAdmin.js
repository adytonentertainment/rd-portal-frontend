import { request } from './client';

// Client-list import admin API (infra PRD §3.2, §10). Upload the spreadsheet,
// review the computed diff + findings, work the resolution queue, then apply.

// POST /admin/client-imports — upload .xlsx/.csv (multipart) → diff + findings.
export const uploadClientList = (file, onProgress) => {
  const form = new FormData();
  form.append('file', file, file.name);
  return request({
    url: '/admin/client-imports',
    method: 'POST',
    data: form,
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100), event);
      }
    },
  });
};

export const getClientImport = (id) => request({ url: `/admin/client-imports/${id}` });

// The manual work list; kind = all | probable | unmatched | unlisted.
export const getResolutionQueue = (id, kind = 'all') =>
  request({ url: `/admin/client-imports/${id}/queue`, params: { kind } });

// Confirm a queued row against admin-chosen account codes ([] = identity only).
export const resolveQueueRow = (id, { sheet, rowNo, accountCodes = [] }) =>
  request({
    url: `/admin/client-imports/${id}/resolve`,
    method: 'POST',
    data: { sheet, row_no: rowNo, account_codes: accountCodes },
  });

// Apply exact matches; the reviewed file is re-sent (hash-guarded server-side).
export const applyClientImport = (id, file) => {
  const form = new FormData();
  form.append('file', file, file.name);
  return request({ url: `/admin/client-imports/${id}/apply`, method: 'POST', data: form });
};
