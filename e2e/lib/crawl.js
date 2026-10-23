// The crawler behind the browser suite.
//
// For every page it reaches it collects the distinct controls (buttons, links,
// tabs, anything with a pointer cursor), clicks each one and asks a single
// question: did anything happen? A click that opens nothing, navigates nowhere,
// changes no form state and sends no request is a DEAD CLICK — the "Move does
// nothing" class of bug, where the handler sets state that nothing renders.
//
// Along the way it reads every screen it lands on for figures formatted the
// viewer's way rather than the US way (the suite runs in a German browser), and
// it records page errors and 5xx responses. Navigations it causes feed the
// queue, so detail pages are found by clicking, the way an admin finds them.

// Controls never clicked: signing out ends the crawl's session.
const SKIP_TEXT = /^(sign out|log ?out|cerrar sesi[oó]n|salir)$/i;

// A figure written the viewer's way instead of the US way. US output never has
// one or two digits after a comma, never groups with spaces, and never shows a
// dollar amount with three decimals.
const NUMBER_RULES = [
  { name: 'comma decimal', re: /(?<![\d.,])\d{1,3}(?:\.\d{3})*,\d{1,2}(?![\d.,])/g },
  { name: 'space thousands', re: /\d[\u00a0\u202f]\d{3}(?!\d)/g },
  { name: 'dot thousands in a dollar amount', re: /\$\s?\d{1,3}(?:\.\d{3})+(?![\d,])/g },
];

const routeKey = (url) =>
  new URL(url).pathname
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[A-Z]{3}\d{2}[HQ]\d(?=\/|$)/g, '/:period')
    .replace(/\/$/, '') || '/';

// Runs in the page: the distinct clickable controls, each with a signature that
// survives a re-render (so it can be found again after a reload) and that
// collapses repeats ("Move" on every row is tested once).
function scanControls() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const textOf = (el) =>
    (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  const sigText = (t) => t.replace(/\d[\d,.:/-]*/g, '#');
  const interactive = 'button,a[href],[role=button],[role=tab],[role=menuitem],[role=link],[role=switch],summary';
  const seen = new Set();
  const out = [];
  const add = (el, kind) => {
    if (!visible(el)) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.closest('[data-e2e-ignore]')) return;
    const href = el.getAttribute('href') || '';
    if (/^(mailto:|tel:|javascript:void)/i.test(href)) return;
    const text = textOf(el);
    if (!text && !el.querySelector('svg,img')) return;
    const sig = [kind, el.tagName.toLowerCase(), el.getAttribute('role') || '', sigText(text), href ? 'href' : ''].join(
      '|'
    );
    if (seen.has(sig)) return;
    seen.add(sig);
    out.push({ sig, text: text || `<${el.tagName.toLowerCase()} icon>`, href });
  };
  document.querySelectorAll(interactive).forEach((el) => add(el, 'control'));
  // Rows, cards and other elements made clickable by an onClick: the pointer
  // cursor is the only trace they leave in the DOM.
  document.querySelectorAll('tr,li,div,span,td,img,svg,label,p,h1,h2,h3,h4').forEach((el) => {
    if (el.closest(interactive)) return;
    if (getComputedStyle(el).cursor !== 'pointer') return;
    if (el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer') return;
    add(el, 'pointer');
  });
  return out;
}

// Runs in the page: mark the first control with this signature for clicking.
function markControl(sig) {
  document.querySelectorAll('[data-e2e-target]').forEach((el) => el.removeAttribute('data-e2e-target'));
  const all = [];
  const interactive = 'button,a[href],[role=button],[role=tab],[role=menuitem],[role=link],[role=switch],summary';
  document.querySelectorAll(interactive).forEach((el) => all.push([el, 'control']));
  document.querySelectorAll('tr,li,div,span,td,img,svg,label,p,h1,h2,h3,h4').forEach((el) => {
    if (el.closest(interactive)) return;
    if (getComputedStyle(el).cursor !== 'pointer') return;
    if (el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer') return;
    all.push([el, 'pointer']);
  });
  const sigText = (t) => t.replace(/\d[\d,.:/-]*/g, '#');
  for (const [el, kind] of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || el.disabled) continue;
    const text = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    const s = [
      kind,
      el.tagName.toLowerCase(),
      el.getAttribute('role') || '',
      sigText(text),
      el.getAttribute('href') ? 'href' : '',
    ].join('|');
    if (s === sig) {
      el.setAttribute('data-e2e-target', '1');
      return true;
    }
  }
  return false;
}

// Runs in the page: a fingerprint of form state, since toggling a checkbox or
// picking an option changes properties, not the DOM.
function formState() {
  return [...document.querySelectorAll('input,select,textarea')]
    .map((e) => `${e.type === 'checkbox' || e.type === 'radio' ? e.checked : ''}|${e.value}`)
    .join('\u0001');
}

function installObserver() {
  if (window.__e2eObserver) return;
  window.__e2eMut = 0;
  window.__e2eObserver = new MutationObserver((records) => {
    for (const r of records) {
      // Our own marker attribute is not an effect of the click.
      if (r.type === 'attributes' && r.attributeName === 'data-e2e-target') continue;
      window.__e2eMut += 1;
    }
  });
  window.__e2eObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
}

function screenText() {
  const svg = [...document.querySelectorAll('svg text')].map((t) => t.textContent).join('\n');
  return `${document.body.innerText}\n${svg}`;
}

// Anything that looks like an open modal: closed after each click so the next
// control is clicked on the page, not under an overlay.
const OVERLAY =
  '[role=dialog],[aria-modal=true],[class*="Overlay"],[class*="overlay"],[class*="Modal_"],[class*="modal_"]';

class Crawler {
  constructor(
    page,
    {
      origin,
      maxPerPage = 80,
      maxPerRoute = 2,
      settleMs = 900,
      follow = true,
      verbose = false,
      screenCheck = null,
      skip = null,
      log = () => {},
    }
  ) {
    this.page = page;
    this.origin = origin;
    // Extra per-screen check, run wherever figures are checked:
    // async (page) => [{ kind, detail }].
    this.screenCheck = screenCheck;
    // Controls this run must not press, by text (e.g. a language switch).
    this.skip = skip;
    this.follow = follow;
    this.verbose = verbose;
    this.maxPerPage = maxPerPage;
    this.maxPerRoute = maxPerRoute;
    this.settleMs = settleMs;
    this.log = log;
    this.queue = [];
    this.visitedUrls = new Set();
    this.routeCounts = {};
    this.findings = [];
    this.stats = { pages: 0, clicks: 0, effective: 0 };
    this.requests = 0;
    this.current = null;
    page.on('request', (req) => {
      if (['xhr', 'fetch', 'document'].includes(req.resourceType())) this.requests += 1;
    });
    page.on('pageerror', (err) => this.finding('page error', err.message.split('\n')[0]));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const t = msg.text();
      // Failed requests are reported once, from the response handler below.
      if (/Failed to load resource/.test(t)) return;
      this.finding('console error', t.slice(0, 300));
    });
    page.on('response', (res) => {
      if (res.status() >= 500) this.finding('server error', `${res.status()} ${res.request().method()} ${res.url()}`);
    });
    page.on('dialog', (d) => {
      this.sawEffect = true;
      d.dismiss().catch(() => {});
    });
    page.on('download', () => {
      this.sawEffect = true;
    });
    page.on('filechooser', () => {
      this.sawEffect = true;
    });
    page.context().on('page', (p) => {
      this.sawEffect = true;
      p.close().catch(() => {});
    });
  }

  skipped(c) {
    return Boolean(c.href) || SKIP_TEXT.test(c.text) || Boolean(this.skip && this.skip.test(c.text));
  }

  finding(kind, detail, extra = {}) {
    const where = this.current || '(startup)';
    const key = `${kind}|${routeKey(this.origin + (where.startsWith('/') ? where : '/'))}|${detail}`;
    if (this.findings.some((f) => f.key === key)) return;
    this.findings.push({ key, kind, page: where, detail, ...extra });
  }

  enqueue(url) {
    let u;
    try {
      u = new URL(url, this.origin);
    } catch {
      return;
    }
    if (u.origin !== this.origin) return;
    const pathAndQuery = u.pathname + u.search;
    if (!this.follow && this.visitedUrls.size) return;
    if (this.visitedUrls.has(pathAndQuery) || this.queue.includes(pathAndQuery)) return;
    const key = routeKey(u.href);
    if ((this.routeCounts[key] || 0) >= this.maxPerRoute) return;
    this.routeCounts[key] = (this.routeCounts[key] || 0) + 1;
    this.queue.push(pathAndQuery);
  }

  async open(path) {
    await this.page.goto(path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await this.page.waitForTimeout(400);
    await this.page.evaluate(installObserver);
  }

  async checkNumbers(context) {
    if (this.screenCheck) {
      const extra = await this.screenCheck(this.page).catch(() => []);
      for (const f of extra) this.finding(f.kind, f.detail, { context });
    }
    return this.page
      .evaluate(screenText)
      .then((text) => {
        for (const rule of NUMBER_RULES) {
          for (const m of text.matchAll(rule.re)) {
            const s = Math.max(0, m.index - 25);
            const snippet = text.slice(s, m.index + m[0].length + 25).replace(/\s+/g, ' ');
            this.finding('number formatted for the viewer locale', `${rule.name}: "${m[0]}" in "…${snippet}…"`, {
              context,
            });
          }
        }
      })
      .catch(() => {});
  }

  async closeOverlays() {
    const open = async () => this.page.locator(OVERLAY).filter({ visible: true }).count();
    if (!(await open())) return;
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(200);
    if (!(await open())) return;
    const close = this.page
      .locator(`${OVERLAY} button`)
      .filter({ hasText: /^(cancel|close|×|✕|x|done|cancelar|cerrar)$/i })
      .filter({ visible: true });
    if (await close.count())
      await close
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
    await this.page.waitForTimeout(200);
  }

  // Click one control and report whether anything happened.
  async probe(control) {
    const page = this.page;
    const found = await page.evaluate(markControl, control.sig).catch(() => false);
    if (!found) return 'missing';
    // The tab, filter or option already in force: clicking it again rightly
    // changes nothing ("All payees" while showing all payees).
    const selected = await page
      .locator('[data-e2e-target="1"]')
      .first()
      .evaluate(
        (el) =>
          ['aria-selected', 'aria-pressed', 'aria-checked', 'aria-current'].some((a) =>
            ['true', 'page'].includes(el.getAttribute(a))
          ) ||
          [...el.classList].some((c) => /(^|[_-])(active|selected|current)([_-]|$)|Active|Selected|Current/.test(c))
      )
      .catch(() => false);
    const before = { url: page.url(), form: await page.evaluate(formState) };
    // Baseline: how much the page changes on its own (spinners, polling).
    await page.evaluate(() => (window.__e2eMut = 0));
    const reqBase = this.requests;
    await page.waitForTimeout(300);
    const baseMut = await page.evaluate(() => window.__e2eMut);
    const baseReq = this.requests - reqBase;

    await page.evaluate(() => (window.__e2eMut = 0));
    const reqStart = this.requests;
    this.sawEffect = false;
    const target = page.locator('[data-e2e-target="1"]').first();
    const clicked = await target
      .click({ timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) return 'unclickable';
    await page.waitForTimeout(this.settleMs);
    if (page.url() !== before.url) return 'navigated';
    const mut = await page.evaluate(() => window.__e2eMut).catch(() => 1);
    const req = this.requests - reqStart;
    const form = await page.evaluate(formState).catch(() => before.form);
    const scale = this.settleMs / 300;
    const changed = mut > Math.ceil(baseMut * scale) || req > Math.ceil(baseReq * scale) || form !== before.form;
    if (this.sawEffect || changed) return 'effect';
    return selected ? 'selected' : 'dead';
  }

  async crawlPage(path) {
    this.current = path;
    this.visitedUrls.add(path);
    this.stats.pages += 1;
    await this.open(path);
    if (new URL(this.page.url()).pathname !== new URL(path, this.origin).pathname) {
      // Redirected (e.g. a guard): crawl it under its real address.
      this.enqueue(this.page.url());
      return;
    }
    await this.checkNumbers('page load');
    const page = this.page;
    // Links are followed rather than clicked one by one.
    for (const href of await page.$$eval('a[href]', (as) => as.map((a) => a.href))) this.enqueue(href);

    const done = new Set();
    let controls = (await page.evaluate(scanControls)).filter((c) => !this.skipped(c));
    this.log(`  ${path}: ${controls.length} controls`);
    for (let i = 0; i < controls.length && done.size < this.maxPerPage; i += 1) {
      const c = controls[i];
      if (done.has(c.sig)) continue;
      done.add(c.sig);
      let result = await this.probe(c);
      if (result === 'missing') {
        // State moved on (a tab switched, a filter applied): start fresh.
        await this.open(path);
        result = await this.probe(c);
      }
      if (result === 'unclickable') {
        // Something covers it (a leftover overlay?) — clear the page and retry.
        await this.open(path);
        result = await this.probe(c);
      }
      if (this.verbose) this.log(`    ${result.padEnd(11)} ${c.sig}`);
      if (result === 'missing') continue;
      this.stats.clicks += 1;
      if (result === 'unclickable') {
        this.stats.unclickable = (this.stats.unclickable || 0) + 1;
        continue;
      }
      if (result === 'dead') {
        this.finding('dead click', `"${c.text}" does nothing`, { control: c.sig });
      } else if (result === 'navigated') {
        this.stats.effective += 1;
        this.enqueue(page.url());
        await this.open(path);
      } else if (result === 'effect') {
        this.stats.effective += 1;
        await this.checkNumbers(`after clicking "${c.text}"`);
        await this.closeOverlays();
        if (new URL(page.url()).pathname !== new URL(path, this.origin).pathname) await this.open(path);
        // Pick up controls the click revealed (a tab's content, an expanded row).
        const fresh = (await page.evaluate(scanControls).catch(() => [])).filter(
          (x) => !this.skipped(x) && !controls.some((y) => y.sig === x.sig)
        );
        controls = controls.concat(fresh);
      }
    }
  }

  async run(seeds) {
    seeds.forEach((s) => this.enqueue(s));
    while (this.queue.length) {
      const next = this.queue.shift();
      await this.crawlPage(next);
    }
    return { findings: this.findings, stats: this.stats, routes: this.routeCounts };
  }
}

module.exports = { Crawler, routeKey, NUMBER_RULES };
