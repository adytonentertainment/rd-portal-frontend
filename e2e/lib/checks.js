// Per-screen checks shared by the specs.

// Words that only English UI text contains. Checked on labels, tabs, buttons
// and headings — never on table cells, where song titles legitimately are.
const ENGLISH = [
  'Earning',
  'Earnings',
  'Songs',
  'Transactions',
  'Statements',
  'Statement',
  'Download',
  'Revenue',
  'Income',
  'Source',
  'Show',
  'Hide',
  'Search',
  'Loading',
  'Settings',
  'Language',
  'Territories',
  'Countries',
  'Platforms',
  'Organization',
  'Previous',
  'Export',
  'Amount',
  'View',
  'Royalties',
  // Sign-in, invite and password pages.
  'Sign',
  'Password',
  'Forgot',
  'Welcome',
  'Username',
  'Invite',
  'invited',
  'Accept',
  'Reset',
  'Choose',
];

const UI_TEXT = 'button,th,[role=tab],label,h2,h3,h4,legend,option,nav a';

// English labels left in the Spanish UI. Reads only what the client sees: the
// preview's portal area, or the whole page when signed in as the writer.
// `selector` widens what is read (sign-in pages have no song titles, so their
// headings and paragraphs are read too).
const englishCheck = (selector) =>
  async function englishInSpanish(page) {
    const texts = await page.evaluate((sel) => {
      const preview = document.querySelector('[data-portal-view]');
      const root = preview || document.body;
      // Only what is on screen: a closed dialog left in the DOM is not read.
      const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
      // In the admin preview the sidebar is the ADMIN's (English by design);
      // signed in as the writer, their own sidebar is read like everything else.
      const adminChrome = (el) => Boolean(preview && el.closest('[class*="sidebar_"]'));
      return [...root.querySelectorAll(sel)]
        .filter((el) => (el.tagName === 'OPTION' || shown(el)) && !adminChrome(el))
        .map((el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    }, selector);
    const rx = new RegExp(`\\b(${ENGLISH.join('|')})\\b`);
    return [...new Set(texts)]
      .filter((t) => rx.test(t))
      .map((t) => ({ kind: 'English in the Spanish portal', detail: `"${t.slice(0, 80)}"` }));
  };

const englishInSpanishUi = englishCheck(UI_TEXT);
const englishInSpanishAuth = englishCheck(`${UI_TEXT},h1,p`);

// Language switches: pressing one mid-run would make the rest of it the other language.
const LANGUAGE_SWITCH = /^(EN|ES|English|Inglés|Español|Spanish)$/i;

module.exports = { englishInSpanishUi, englishInSpanishAuth, LANGUAGE_SWITCH };
