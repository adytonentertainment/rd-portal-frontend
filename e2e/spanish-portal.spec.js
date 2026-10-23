// The client portal as a Spanish-speaking writer sees it: a Spanish browser,
// so the portal opens in Spanish and the browser's own number convention is
// comma-decimal. Crawls the client view (via the admin preview) and fails on
// English labels left in the Spanish UI, figures not written the US way, and
// dead clicks.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { Crawler } = require('./lib/crawl');
const { englishInSpanishUi, LANGUAGE_SWITCH } = require('./lib/checks');
const { API } = require('./global-setup');

test.use({ locale: 'es-ES', timezoneId: 'America/Mexico_City' });

test('Spanish client portal: Spanish labels, US figures, no dead clicks', async ({ page, request, baseURL }) => {
  const ids = [];
  for (const name of ['Rata Blanca', 'B-Legit', 'Dante Storch']) {
    const res = await request.get(`${API}/admin/writers`, { params: { search: name, page_size: 2 } });
    if (res.ok()) ids.push(...((await res.json()).items || []).map((w) => w.id));
  }
  const crawler = new Crawler(page, {
    origin: new URL(baseURL).origin,
    follow: false,
    maxPerRoute: ids.length,
    screenCheck: englishInSpanishUi,
    // Switching the portal to English would make the rest of the run English.
    skip: LANGUAGE_SWITCH,
    log: (m) => console.log(m),
  });
  const result = await crawler.run([...new Set(ids)].map((id) => `/admin/writers/${id}/preview`));
  const out = path.join(__dirname, '.tmp', 'spanish-report.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  const lines = result.findings.map((f) => `  [${f.kind}] ${f.page} — ${f.detail}`);
  const message = `${result.findings.length} problem(s):\n${lines.join('\n')}\nFull report: ${out}`;
  console.log(message);
  expect(result.findings, message).toEqual([]);
});
