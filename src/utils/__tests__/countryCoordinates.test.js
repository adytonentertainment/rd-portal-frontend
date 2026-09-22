/**
 * Aggregate territories are not places.
 *
 * YouTube reports publishing income for eight territories individually and
 * lumps the entire rest of the world into a single 'ROW' line. That row then
 * sits in a list of countries while meaning something categorically different:
 * no location, so no pin on the globe.
 *
 * Before this was named, ROW was just "a code with no coordinates", which is
 * indistinguishable from a real country we're missing data for. It produced
 * three separate symptoms, all pinned below.
 */

import {
  AGGREGATE_TERRITORIES,
  isAggregateTerritory,
  territoryDisplayName,
  getCountryCoordinates,
} from '../countryCoordinates';

describe('aggregate territories', () => {
  it('recognises ROW, case-insensitively', () => {
    expect(isAggregateTerritory('ROW')).toBe(true);
    expect(isAggregateTerritory('row')).toBe(true);
    expect(isAggregateTerritory('US')).toBe(false);
    expect(isAggregateTerritory('')).toBe(false);
    expect(isAggregateTerritory(undefined)).toBe(false);
  });

  it('names ROW consistently wherever it is rendered', () => {
    // The defect: the Top 10 Countries panel resolved names off the
    // coordinates map, so an unmappable code fell through to the raw string.
    // That panel said "ROW" while the rest of the page said "Rest of World".
    expect(territoryDisplayName('ROW')).toBe('Rest of World');
    expect(territoryDisplayName('row')).toBe('Rest of World');
    // A fallback must not be able to override the aggregate's real name.
    expect(territoryDisplayName('ROW', 'ROW')).toBe('Rest of World');
  });

  it('still names ordinary countries and falls back for unknown codes', () => {
    expect(territoryDisplayName('US')).toBe('United States');
    expect(territoryDisplayName('CA')).toBe('Canada');
    expect(territoryDisplayName('ZZ', 'Somewhere')).toBe('Somewhere');
    expect(territoryDisplayName('ZZ')).toBe('ZZ');
  });

  it('documents which territories ROW excludes', () => {
    // This is the answer to "what does ROW include?" — everything except these.
    expect(AGGREGATE_TERRITORIES.ROW.itemised).toEqual(['US', 'CA', 'BR', 'PR', 'VI', 'GU', 'AS', 'MP']);
    expect(AGGREGATE_TERRITORIES.ROW.explain).toMatch(/not shown on the globe/i);
  });

  it('has no coordinates, and does not warn about it', () => {
    // An aggregate lacking coordinates is correct, not a defect. Warning on it
    // every render buried the warning that matters: a real country being
    // silently dropped off the globe.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(getCountryCoordinates('ROW')).toBeNull();
      expect(warn).not.toHaveBeenCalled();

      // A genuinely unknown country code still warns — once, not per render.
      expect(getCountryCoordinates('QQ')).toBeNull();
      expect(getCountryCoordinates('QQ')).toBeNull();
      expect(getCountryCoordinates('QQ')).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('resolves real coordinates for ordinary countries', () => {
    const us = getCountryCoordinates('US');
    expect(us).not.toBeNull();
    expect(typeof us.lat).toBe('number');
    expect(typeof us.lng).toBe('number');
  });
});
