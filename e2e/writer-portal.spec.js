// The portal as a signed-in WRITER sees it, in both of its languages: their
// own earnings, statements and settings — pages the admin preview never shows.
// Fails on dead clicks, non-US figures, page/server errors and, in Spanish,
// English labels.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { Crawler } = require('./lib/crawl');
const { englishInSpanishUi, LANGUAGE_SWITCH } = require('./lib/checks');

const WRITER_PAGES = ['/earnings', '/statements', '/settings'];

const LANGS = [
  // English portal in a German browser: English words, German number habits.
  { lang: 'en', locale: 'de-DE', check: null },
  { lang: 'es', locale: 'es-ES', check: englishInSpanishUi },
];

for (const { lang, locale, check } of LANGS) {
  test.describe(`writer portal (${lang})`, () => {
    const state = path.join(__dirname, '.tmp', `writer-${lang}.json`);
    test.use({ storageState: state, locale });

    test(`signed in as a writer, in ${lang === 'en' ? 'English' : 'Spanish'}`, async ({ page, baseURL }) => {
      test.skip(!fs.existsSync(state), 'no writer invite could be seeded');
      // Top window only: sandboxed frames on the page (statement previews) have no storage.
      await page.addInitScript((l) => {
        if (window.top !== window) return;
        try {
          window.localStorage.setItem('portalLanguage', l);
        } catch {
          // no storage: the browser language decides
        }
      }, lang);
      const crawler = new Crawler(page, {
        origin: new URL(baseURL).origin,
        screenCheck: check,
        skip: LANGUAGE_SWITCH,
        log: (m) => console.log(m),
      });
      const result = await crawler.run(WRITER_PAGES);
      const out = path.join(__dirname, '.tmp', `writer-${lang}-report.json`);
      fs.writeFileSync(out, JSON.stringify(result, null, 2));
      const lines = result.findings.map((f) => `  [${f.kind}] ${f.page} — ${f.detail}`);
      const message = `${result.findings.length} problem(s) on ${result.stats.pages} pages, ${result.stats.clicks} clicks:\n${lines.join('\n')}\nFull report: ${out}`;
      console.log(message);
      expect(result.findings, message).toEqual([]);
      expect(result.stats.tooltips, 'no chart tooltip was read: the chart check did nothing').toBeGreaterThan(0);
    });
  });
}
