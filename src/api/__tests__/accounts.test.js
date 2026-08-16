/* eslint-env jest */
import axios from 'axios';
import { registerAccount, login, getMyAccount, listAdmins, approveAdmin, revokeAdmin } from '../accounts';

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
    [() => getMyAccount(), 'GET', '/auth/me/account'],
    [() => listAdmins(), 'GET', '/admin/accounts/admins'],
    [() => approveAdmin(3), 'POST', '/admin/accounts/admins/3/approve'],
    [() => revokeAdmin(3), 'POST', '/admin/accounts/admins/3/revoke'],
  ])('maps %#', async (call, method, path) => {
    await call();
    const cfg = last();
    expect((cfg.method || 'GET').toUpperCase()).toBe(method);
    expect(cfg.url).toBe(`${BASE}${path}`);
    expect(cfg.headers.Authorization).toBe('Bearer test-token');
  });
});

describe('registerAccount', () => {
  it('sends a writer registration without an admin code', async () => {
    await registerAccount({ email: 'a@b.com', username: 'abuser', password: 'pw', role: 'writer' });
    const cfg = last();
    expect(cfg.url).toBe(`${BASE}/auth/register`);
    expect(cfg.method).toBe('POST');
    expect(cfg.data).toEqual({ email: 'a@b.com', username: 'abuser', password: 'pw', role: 'writer' });
    expect(cfg.data.admin_code).toBeUndefined();
  });

  it('includes admin_code (snake_case) for an admin registration', async () => {
    await registerAccount({
      email: 'ops@verax.app',
      username: 'opsuser',
      password: 'pw',
      role: 'admin',
      adminCode: 'letmein',
    });
    expect(last().data).toEqual({
      email: 'ops@verax.app',
      username: 'opsuser',
      password: 'pw',
      role: 'admin',
      admin_code: 'letmein',
    });
  });

  it('defaults to the writer role', async () => {
    await registerAccount({ email: 'c@d.com', username: 'cduser', password: 'pw' });
    expect(last().data.role).toBe('writer');
  });
});

describe('login', () => {
  it('posts form-encoded credentials to /auth/token', async () => {
    await login('admin', 'secret');
    const cfg = last();
    expect(cfg.url).toBe(`${BASE}/auth/token`);
    expect(cfg.method).toBe('POST');
    expect(cfg.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(cfg.data).toBeInstanceOf(URLSearchParams);
    expect(cfg.data.get('username')).toBe('admin');
    expect(cfg.data.get('password')).toBe('secret');
  });
});

describe('listAdmins', () => {
  it('passes pending=true only when asked', async () => {
    await listAdmins(true);
    expect(last().params).toEqual({ pending: true });
    await listAdmins(false);
    expect(last().params).toEqual({});
  });
});
