// Admin Writer/Client Manager API — server-side paginated/searchable roster
// CRUD (Writer-Scale UX PRD, Feature C). Mirrors the shared `client.js` wrapper
// used by portal.js / clientImportAdmin.js. Every call resolves with the
// response body or rejects with { status, message, detail } (status 0 =
// backend unreachable).
import axios from 'axios';
import { baseUrl, normalizeError, request, sessionRequestOptions } from './client';

// GET /admin/writers?page=&page_size=&search=&kind=&status=
// → { items, total, page, page_size }
export const listWriters = ({
  page = 1,
  pageSize = 25,
  search = '',
  kind = '',
  status = '',
  needsInfo,
  needsFix,
  includeUnmatched,
  dataGap,
  membership,
} = {}) => {
  const params = { page, page_size: pageSize };
  if (search) params.search = search;
  if (kind) params.kind = kind;
  if (status) params.status = status;
  if (needsInfo != null) params.needs_info = needsInfo;
  if (needsFix != null) params.needs_fix = needsFix;
  // Only payees whose statement data is missing or partial — the toggle next
  // to the client / commission-partner filters.
  if (dataGap != null) params.data_gap = dataGap;
  // Fold unmatched statement accounts into the same list as the clients, rather
  // than answering for them in a separate panel.
  if (includeUnmatched != null) params.include_unmatched = includeUnmatched;
  // 'client' | 'commission_partner' | 'any' — the roster holds both, and they
  // are different things: 810 clients vs 78 commission partners.
  if (membership) params.membership = membership;
  return request({ url: '/admin/writers', params });
};

// GET /admin/writers/{id} → writer fields + contacts + read-only accounts + invites
export const getWriter = (id) => request({ url: `/admin/writers/${id}` });

// GET /admin/writers/{id}/portal-view → READ-ONLY copy of what this client
// sees in their own portal. Served by the same aggregation functions the
// portal itself uses, so the preview cannot drift from the real page.
export const getWriterPortalView = (id) => request({ url: `/admin/writers/${id}/portal-view` });

// POST /admin/writers → create (canonical_name required)
export const createWriter = (data) => request({ url: '/admin/writers', method: 'POST', data });

// PATCH /admin/writers/{id} → update editable fields (only sent keys are applied)
export const updateWriter = (id, data) => request({ url: `/admin/writers/${id}`, method: 'PATCH', data });

// POST /admin/writers/{id}/archive → soft-remove (status=offboarded)
export const archiveWriter = (id) => request({ url: `/admin/writers/${id}/archive`, method: 'POST' });

// POST /admin/writers/bulk-remove → clear several clients at once from the
// "needs attention" cleanup view. Empty rows are deleted; rows holding
// statement accounts are offboarded instead, so royalties are never orphaned.
// The response reports which happened to each: { deleted, archived, skipped }.
export const bulkRemoveWriters = (writerIds) =>
  request({ url: '/admin/writers/bulk-remove', method: 'POST', data: { writer_ids: writerIds } });

// POST /admin/writers/{id}/contacts → record a contact email (no invite sent)
export const addContact = (id, { email, displayName, role = 'primary' }) =>
  request({
    url: `/admin/writers/${id}/contacts`,
    method: 'POST',
    data: { email, display_name: displayName, role },
  });

// DELETE /admin/writers/{id}/contacts/{contactId} → remove a contact's access link
// The name shown for a contact. Stored on the Contact, which is shared, so one
// correction lands on every client that address reaches — aramtve@gmail.com
// reaches 79 of them, and fixing it per client would mean 79 edits that drift.
export const renameContact = (id, contactId, displayName) =>
  request({
    url: `/admin/writers/${id}/contacts/${contactId}`,
    method: 'PATCH',
    data: { display_name: displayName },
  });

export const unlinkContact = (id, contactId) =>
  request({ url: `/admin/writers/${id}/contacts/${contactId}`, method: 'DELETE' });

// POST /admin/writers/{id}/invites/{inviteId}/revoke → admin revoke of a pending invite
export const revokeInvite = (id, inviteId) =>
  request({ url: `/admin/writers/${id}/invites/${inviteId}/revoke`, method: 'POST' });

// Accept a "did you mean X?" guess: hand the unmatched account's statements to
// that client. Only an unmatched row can be assigned, and never one whose
// statements have already gone out — the backend enforces both.
export const assignUnmatchedToClient = (writerId, targetWriterId) =>
  request({
    url: `/admin/writers/${writerId}/assign`,
    method: 'POST',
    data: { target_writer_id: targetWriterId },
  });

// Move one beneficiary account, and every statement under it, to another
// client. Portal reads resolve ownership through the account's current writer,
// so this takes effect immediately for both sides.
// Register a beneficiary code on a client before its statements arrive, so
// ingest files them there. The catalog follows from the code unless given.
export const addAccount = (writerId, accountCode, catalog) =>
  request({
    url: `/admin/writers/${writerId}/accounts`,
    method: 'POST',
    data: { account_code: accountCode, ...(catalog ? { catalog } : {}) },
  });

// Take back a code added by mistake (only while no statement has arrived).
export const removeAccount = (writerId, accountId) =>
  request({ url: `/admin/writers/${writerId}/accounts/${accountId}`, method: 'DELETE' });

export const moveAccount = (writerId, accountId, targetWriterId) =>
  request({
    url: `/admin/writers/${writerId}/accounts/${accountId}/move`,
    method: 'POST',
    data: { target_writer_id: targetWriterId },
  });

// Send ONE client their statements now, without waiting for the whole batch to
// be clean. Refuses (409, with reasons) when this client is the unresolved one.
export const distributeToWriter = (writerId) =>
  request({ url: `/admin/writers/${writerId}/distribute`, method: 'POST' });

// Remove a single statement and its line detail. If it was published, the
// client stops seeing it — the response says how many copies were withdrawn.
export const deleteWriterStatement = (writerId, statementId) =>
  request({ url: `/admin/writers/${writerId}/statements/${statementId}`, method: 'DELETE' });

// GET /admin/writers/summary → roster-wide rollup for the dashboard header
export const getRosterSummary = () => request({ url: '/admin/writers/summary' });

// POST /admin/writers/distribute-all → publish every ready batch to client
// portals. force=true acknowledges the send-time warnings (clients with no
// statements / unmatched accounts); hard blockers can never be forced.
export const distributeAll = (force = false) =>
  request({ url: '/admin/writers/distribute-all', method: 'POST', data: { force } });

// The roster as a spreadsheet for review: every client and commission partner,
// codes split by kind, contacts, and the problems found on each entry.
// Fetched (not linked) so it rides the session cookie and CSRF header.
export const downloadRosterXlsx = async () => {
  try {
    const session = sessionRequestOptions();
    const response = await axios({
      url: `${baseUrl()}/admin/writers/export/roster`,
      responseType: 'blob',
      ...session,
    });
    const name = (response.headers?.['content-disposition'] || '').match(/filename="([^"]+)"/)?.[1] || 'rd-roster.xlsx';
    const href = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Freed on the next tick: revoking synchronously races the download in Safari.
    setTimeout(() => URL.revokeObjectURL(href), 0);
  } catch (error) {
    throw normalizeError(error);
  }
};

// Bulk roster corrections: the roster export, edited. Preview first (changes
// nothing), then apply — all of it or none of it.
const sheetForm = (file) => {
  const form = new FormData();
  form.append('file', file, file.name);
  return form;
};
export const previewRosterCorrections = (file) =>
  request({ url: '/admin/writers/corrections/preview', method: 'POST', data: sheetForm(file) });
export const applyRosterCorrections = (file) =>
  request({ url: '/admin/writers/corrections/apply', method: 'POST', data: sheetForm(file) });
