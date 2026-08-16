import { request } from './client';

// Verax account API (role-based auth + admin approval).
//   - register: pick 'writer' or 'admin'. Admin requires a signup code and
//     lands PENDING until an existing admin approves it.
//   - getMyAccount: the source of truth for whether the caller is an admin —
//     the frontend should route off this, never a hardcoded email list.

export const registerAccount = ({ email, username, password, role = 'writer', adminCode }) =>
  request({
    url: '/auth/register',
    method: 'POST',
    data: {
      email,
      username,
      password,
      role,
      ...(adminCode ? { admin_code: adminCode } : {}),
    },
  });

// OAuth2 password flow — the backend expects form encoding, not JSON.
export const login = (username, password) => {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  return request({
    url: '/auth/token',
    method: 'POST',
    data: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

// { id, email, username, role, admin_approved, is_admin, pending_admin_approval }
export const getMyAccount = () => request({ url: '/auth/me/account' });

// --- admin approval workflow (approved admins only) --------------------------

export const listAdmins = (pendingOnly = false) =>
  request({ url: '/admin/accounts/admins', params: pendingOnly ? { pending: true } : {} });

export const approveAdmin = (userId) => request({ url: `/admin/accounts/admins/${userId}/approve`, method: 'POST' });

export const revokeAdmin = (userId) => request({ url: `/admin/accounts/admins/${userId}/revoke`, method: 'POST' });
