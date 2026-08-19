import { request } from './client';

// Writer-portal API (infra PRD §7.2, §7.3, §10). Two audiences:
//  - contact-scoped /me/*  (a logged-in writer/manager)
//  - public /portal/*      (preview + accept an invite; the token is the auth)
// Plus admin bootstrap invites under /admin/writers/{id}/invites.

// --- contact-scoped: /me -----------------------------------------------------

export const getMe = () => request({ url: '/me' });

export const listMyWriters = () => request({ url: '/me/writers' });

// Remember the portal UI language on the contact record so the choice follows
// the writer to another device instead of living only in one browser.
export const setMyLanguage = (language) => request({ url: '/me/language', method: 'PUT', data: { language } });

export const listWriterMembers = (writerId) => request({ url: `/me/writers/${writerId}/members` });

// Dropbox-style share: grant another email access to a writer you can access.
export const shareWriterAccess = (writerId, email, role = 'manager') =>
  request({
    url: `/me/writers/${writerId}/invites`,
    method: 'POST',
    data: { email, role },
  });

export const revokeMyInvite = (inviteId) => request({ url: `/me/invites/${inviteId}/revoke`, method: 'POST' });

export const listMyStatements = (writerId) =>
  request({ url: '/me/statements', params: writerId ? { writer_id: writerId } : {} });

// Line-item royalty data across the writer's distributed statements, shaped
// for the earnings portal's overview/pies/globe/bars (see Revenue.jsx).
export const listMyTransactions = (writerId) =>
  request({ url: '/me/transactions', params: writerId ? { writer_id: writerId } : {} });

// Net earnings the writer is actually paid, plus the statement waterfall that
// explains it (gross, carried forward, recouped, commission). The portal
// headline MUST come from here — line-item sums are gross and contradict the
// writer's own PDF.
export const getMyEarnings = (writerId) =>
  request({ url: '/me/earnings', params: writerId ? { writer_id: writerId } : {} });

export const getMyStatement = (distributionId) => request({ url: `/me/statements/${distributionId}` });

export const getMyStatementBreakdown = (distributionId) =>
  request({ url: `/me/statements/${distributionId}/breakdown` });

// PDF download (auth is a Bearer header, so fetch as a blob rather than a bare
// link). Returns a Blob; caller makes/revokes the object URL.
export const downloadMyStatementPdf = (distributionId) =>
  request({
    url: `/me/statements/${distributionId}/pdf`,
    responseType: 'blob',
    headers: { accept: 'application/pdf' },
  });

// --- admin bootstrap: /admin/writers/{id}/invites ----------------------------

export const adminInviteToWriter = (writerId, email, role = 'primary') =>
  request({
    url: `/admin/writers/${writerId}/invites`,
    method: 'POST',
    data: { email, role },
  });

export const adminListWriterInvites = (writerId) => request({ url: `/admin/writers/${writerId}/invites` });

// Re-send an invite email. Tokens are hashed and single-use, so the original
// link cannot be re-sent — this issues a fresh one and revokes the old.
export const adminResendInvite = (writerId, inviteId) =>
  request({ url: `/admin/writers/${writerId}/invites/${inviteId}/resend`, method: 'POST' });

// --- public accept: /portal --------------------------------------------------

export const previewInvite = (token) => request({ url: `/portal/invites/${token}` });

export const acceptInvite = (token, password) =>
  request({ url: '/portal/accept-invite', method: 'POST', data: { token, password } });

// Invite many clients at once — one email each, to their primary contact.
// The response is a summary, never tokens: a batch of live invite links in the
// browser would be hundreds of bearer credentials. Per-client links stay in
// that client's own invite dialog.
export const adminBulkInvite = (writerIds, { resendPending = false } = {}) =>
  request({
    url: '/admin/writers/bulk-invite',
    method: 'POST',
    data: { writer_ids: writerIds, resend_pending: resendPending },
  });
