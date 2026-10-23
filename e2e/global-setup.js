// Create the suite's admin on the throwaway database and save its session, so
// every test starts signed in without driving the login form.
const fs = require('fs');
const path = require('path');
const { request } = require('@playwright/test');

const API = `http://localhost:${process.env.E2E_API_PORT || '8100'}`;
const ADMIN = { email: 'e2e-admin@example.com', username: 'e2eadmin', password: 'E2e-Admin-Pass-1!' };

module.exports = async () => {
  const tmp = path.join(__dirname, '.tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const api = await request.newContext({ baseURL: API, extraHTTPHeaders: { 'X-Requested-With': 'XMLHttpRequest' } });
  const reg = await api.post('/auth/register', {
    data: { ...ADMIN, role: 'admin', admin_code: 'e2e-admin-code' },
  });
  if (![200, 201, 400, 409].includes(reg.status())) {
    throw new Error(`register admin: ${reg.status()} ${await reg.text()}`);
  }
  const login = await api.post('/auth/token', { form: { username: ADMIN.email, password: ADMIN.password } });
  if (!login.ok()) throw new Error(`login admin: ${login.status()} ${await login.text()}`);
  await api.storageState({ path: path.join(tmp, 'admin.json') });
  await api.dispose();

  // Writers: redeem the invites seed_invites.py created, through the real
  // endpoint, and keep each writer's session (writer-en.json, writer-es.json).
  const invites = path.join(tmp, 'invites.json');
  const tokens = fs.existsSync(invites) ? JSON.parse(fs.readFileSync(invites, 'utf8')) : {};
  for (const [lang, inv] of Object.entries(tokens)) {
    const w = await request.newContext({ baseURL: API, extraHTTPHeaders: { 'X-Requested-With': 'XMLHttpRequest' } });
    const res = await w.post('/portal/accept-invite', {
      data: { token: inv.token, password: WRITER_PASSWORD, username: `e2e-writer-${lang}` },
    });
    if (!res.ok()) throw new Error(`accept ${lang} invite: ${res.status()} ${await res.text()}`);
    await w.storageState({ path: path.join(tmp, `writer-${lang}.json`) });
    await w.dispose();
  }
};

const WRITER_PASSWORD = 'E2e-Writer-Pass-1!';

module.exports.API = API;
module.exports.ADMIN = ADMIN;
