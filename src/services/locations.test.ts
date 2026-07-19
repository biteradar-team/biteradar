import {describe, expect, it} from 'vitest';
import {LocationInputSchema, slugify} from './location-input';

const valid = {
  brand: {name: 'Ćevabdžinica Kod Laze'},
  location: {
    city: 'ns',
    address: 'Zmaj Jovina 1',
    lat: 45.25,
    lng: 19.83,
    acceptsCards: 'unknown',
    status: 'draft',
  },
  hours: [
    {day: 0, closed: true},
    {day: 1, closed: false, opensAt: '08:00', closesAt: '23:00'},
    {day: 2, closed: false, opensAt: '22:00', closesAt: '02:00'}, // past midnight
    {day: 3, closed: true},
    {day: 4, closed: true},
    {day: 5, closed: true},
    {day: 6, closed: true},
  ],
  menu: [{name: 'Ćevapi 10 kom', priceRsd: '650'}],
};

describe('LocationInputSchema', () => {
  it('accepts a valid payload and coerces types', () => {
    const out = LocationInputSchema.parse(valid);
    expect(out.location.acceptsCards).toBeNull(); // 'unknown' → null
    expect(out.location.lat).toBe(45.25);
    expect(out.menu[0].priceRsd).toBe(650); // coerced string → int
  });

  it('maps yes/no cards to boolean', () => {
    const yes = LocationInputSchema.parse({
      ...valid,
      location: {...valid.location, acceptsCards: 'yes'},
    });
    expect(yes.location.acceptsCards).toBe(true);
  });

  it('rejects a blank / whitespace / non-numeric price (was silently saved as 0)', () => {
    for (const priceRsd of ['', '  ', 'abc']) {
      expect(() =>
        LocationInputSchema.parse({
          ...valid,
          menu: [{name: 'Ćevapi 10 kom', priceRsd}],
        }),
      ).toThrow();
    }
  });

  it('rejects an open day missing its times', () => {
    const bad = {
      ...valid,
      hours: [{day: 1, closed: false}, ...valid.hours.slice(1)],
    };
    expect(() => LocationInputSchema.parse(bad)).toThrow();
  });

  it('rejects a blank brand name and out-of-range coords', () => {
    expect(() =>
      LocationInputSchema.parse({...valid, brand: {name: '  '}}),
    ).toThrow();
    expect(() =>
      LocationInputSchema.parse({
        ...valid,
        location: {...valid.location, lat: 200},
      }),
    ).toThrow();
  });
});

describe('slugify', () => {
  it('folds script/diacritics and hyphenates', () => {
    expect(slugify('Ćevabdžinica Kod Laze')).toBe('cevabdzinica-kod-laze');
    expect(slugify('Пекара №1')).toBe('pekara-1');
  });
});
