// Click everything, everywhere. Fails on dead clicks, figures formatted for the
// viewer's locale, page errors and server errors — with one line per problem
// saying where it is. The full list is written to e2e/.tmp/crawl-report.json.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { Crawler } = require('./lib/crawl');
const { englishInSpanishAuth, LANGUAGE_SWITCH } = require('./lib/checks');
const { API } = require('./global-setup');

const MAX_PER_PAGE = Number(process.env.E2E_MAX_PER_PAGE || 80);
const MAX_PER_ROUTE = Number(process.env.E2E_MAX_PER_ROUTE || 2);

const ADMIN_PAGES = [
  '/admin',
  '/admin/statements',
  '/admin/statements/upload',
  '/admin/writers',
  '/admin/distributions',
  '/admin/accounts',
  '/settings',
];

// Clients whose data has caught bugs before, plus whatever the roster leads with.
const NAMED_CLIENTS = ['B-Legit', 'Rata Blanca', 'Likybo'];

async function writerIds(request) {
  const ids = [];
  for (const name of NAMED_CLIENTS) {
    const res = await request.get(`${API}/admin/writers`, { params: { search: name, page_size: 3 } });
    if (res.ok()) ids.push(...((await res.json()).items || []).map((w) => w.id));
  }
  const res = await request.get(`${API}/admin/writers`, { params: { page_size: 2 } });
  if (res.ok()) ids.push(...((await res.json()).items || []).map((w) => w.id));
  return [...new Set(ids)];
}

function report(name, result) {
  const out = path.join(__dirname, '.tmp', `${name}-report.json`);
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  const lines = result.findings.map(
    (f) => `  [${f.kind}] ${f.page} — ${f.detail}${f.context ? ` (${f.context})` : ''}`
  );
  return `${result.findings.length} problem(s) on ${result.stats.pages} pages, ${result.stats.clicks} clicks:\n${lines.join('\n')}\nFull report: ${out}`;
}

test('admin: every control on every page does something', async ({ page, request, baseURL }) => {
  const ids = await writerIds(request);
  // E2E_SEEDS="/admin/writers/733,/admin" crawls just those pages (debugging).
  const seeds = process.env.E2E_SEEDS
    ? process.env.E2E_SEEDS.split(',')
    : [
        ...ADMIN_PAGES,
        ...ids.map((id) => `/admin/writers/${id}`),
        ...ids.slice(0, 3).map((id) => `/admin/writers/${id}/preview`),
      ];
  const crawler = new Crawler(page, {
    origin: new URL(baseURL).origin,
    maxPerPage: MAX_PER_PAGE,
    // Named clients each get their own detail page; repeats of other routes are capped.
    maxPerRoute: Math.max(MAX_PER_ROUTE, ids.length),
    follow: process.env.E2E_NO_FOLLOW !== '1',
    verbose: process.env.E2E_VERBOSE === '1',
    log: (m) => console.log(m),
  });
  const result = await crawler.run(seeds);
  const message = report('admin', result);
  console.log(message);
  expect(result.findings, message).toEqual([]);
});

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('public pages: every control does something', async ({ page, baseURL }) => {
    const crawler = new Crawler(page, {
      origin: new URL(baseURL).origin,
      maxPerPage: MAX_PER_PAGE,
      log: (m) => console.log(m),
    });
    const result = await crawler.run(['/login', '/register', '/forgotPassword', '/pp', '/tos', '/imprint']);
    const message = report('public', result);
    console.log(message);
    expect(result.findings, message).toEqual([]);
  });

  // What a Spanish-speaking writer sees before they are in: sign in, forgot
  // and reset password, and an invite link (seeded, left open).
  test.describe('in Spanish', () => {
    test.use({ locale: 'es-ES' });

    test('sign-in pages are Spanish, with no dead clicks', async ({ page, baseURL }) => {
      const invites = path.join(__dirname, '.tmp', 'invites.json');
      const open = fs.existsSync(invites) ? JSON.parse(fs.readFileSync(invites, 'utf8'))['es-open'] : null;
      const crawler = new Crawler(page, {
        origin: new URL(baseURL).origin,
        follow: false,
        maxPerRoute: 5,
        screenCheck: englishInSpanishAuth,
        skip: LANGUAGE_SWITCH,
        log: (m) => console.log(m),
      });
      const pages = ['/login', '/forgotPassword', '/resetPassword?token=e2e-not-a-token'];
      if (open) pages.push(`/invite/${open.token}`);
      const result = await crawler.run(pages);
      const message = report('signin-es', result);
      console.log(message);
      expect(open, 'an open invite should have been seeded').toBeTruthy();
      expect(result.findings, message).toEqual([]);
    });
  });
});
