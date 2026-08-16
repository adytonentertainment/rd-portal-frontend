import translations, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../translations';

// A key present in English but missing in Spanish renders an English string in
// the middle of a Spanish screen — the kind of gap nobody notices until a
// writer sees it.
describe('portal translations', () => {
  it('covers every language listed as supported', () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      expect(Object.keys(translations[lang] || {}).length).toBeGreaterThan(0);
    });
  });

  it('has no key that exists in one language but not the other', () => {
    const en = Object.keys(translations.en).sort();
    const es = Object.keys(translations.es).sort();
    expect(es.filter((k) => !translations.en[k])).toEqual([]);
    expect(en.filter((k) => !translations.es[k])).toEqual([]);
  });

  it('actually translates — Spanish is not a copy of English', () => {
    // Codes like EN/ES are legitimately identical; prose must not be.
    const identical = Object.keys(translations.en).filter(
      (k) => translations.en[k] === translations.es[k] && translations.en[k].length > 4
    );
    expect(identical.sort()).toEqual(['lang.switchToEnglish', 'lang.switchToSpanish']);
  });

  it('keeps the same placeholders in both languages', () => {
    const holders = (s) => (s.match(/\{[a-z]+\}/gi) || []).sort();
    Object.keys(translations.en).forEach((k) => {
      expect(holders(translations.es[k])).toEqual(holders(translations.en[k]));
    });
  });

  it('defaults to a supported language', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });
});
