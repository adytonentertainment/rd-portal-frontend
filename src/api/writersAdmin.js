// Admin Writer/Client Manager API — server-side paginated/searchable roster
// CRUD (Writer-Scale UX PRD, Feature C). Mirrors the shared `client.js` wrapper
// used by portal.js / clientImportAdmin.js. Every call resolves with the
// response body or rejects with { status, message, detail } (status 0 =
// backend unreachable).
import { request } from './client';

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
  membership,
} = {}) => {
  const params = { page, page_size: pageSize };
  if (search) params.search = search;
  if (kind) params.kind = kind;
  if (status) params.status = status;
  if (needsInfo != null) params.needs_info = needsInfo;
  if (needsFix != null) params.needs_fix = needsFix;
  // 'client' | 'commission_partner' | 'any' — the roster holds both, and they
  // are different things: 810 clients vs 78 commission partners.
  if (membership) params.membership = membership;
  return request({ url: '/admin/writers', params });
};

// GET /admin/writers/{id} → writer fields + contacts + read-only accounts + invites
export const getWriter = (id) => request({ url: `/admin/writers/${id}` });

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
export const unlinkContact = (id, contactId) =>
  request({ url: `/admin/writers/${id}/contacts/${contactId}`, method: 'DELETE' });

// POST /admin/writers/{id}/invites/{inviteId}/revoke → admin revoke of a pending invite
export const revokeInvite = (id, inviteId) =>
  request({ url: `/admin/writers/${id}/invites/${inviteId}/revoke`, method: 'POST' });

// POST /admin/writers/reset-all → DEV/testing: wipe all client + statement data
export const resetAllData = () => request({ url: '/admin/writers/reset-all', method: 'POST' });

// GET /admin/writers/summary → roster-wide rollup for the dashboard header
export const getRosterSummary = () => request({ url: '/admin/writers/summary' });

// POST /admin/writers/distribute-all → publish every ready batch to client
// portals. force=true acknowledges the send-time warnings (clients with no
// statements / unmatched accounts); hard blockers can never be forced.
export const distributeAll = (force = false) =>
  request({ url: '/admin/writers/distribute-all', method: 'POST', data: { force } });
