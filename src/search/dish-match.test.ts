import {describe, expect, it} from 'vitest';
import {matchDish, type DishCandidate} from './dish-match';
import {normalize} from './normalize';

// Canonical dishes as they'd be seeded (normalizedName via normalize()).
const dishes: DishCandidate[] = [
  {id: 'cevapi', nameSr: 'Ćevapi'},
  {id: 'pljeskavica', nameSr: 'Pljeskavica'},
  {id: 'punjena-pljeskavica', nameSr: 'Punjena pljeskavica'},
  {id: 'karadjordjeva', nameSr: 'Karađorđeva šnicla'},
].map((d) => ({id: d.id, normalizedName: normalize(d.nameSr)}));

describe('matchDish', () => {
  it('matches a decorated item name to its dish (token containment)', () => {
    expect(matchDish('Ćevapi 10 kom', dishes)).toBe('cevapi');
    expect(matchDish('ćevapi porcija', dishes)).toBe('cevapi');
  });

  it('folds script + diacritics (Cyrillic / latin both match)', () => {
    expect(matchDish('ЋЕВАПИ', dishes)).toBe('cevapi');
    // đ↔dj folding: the ascii "karadjordjeva snicla" hits "Karađorđeva šnicla".
    expect(matchDish('karadjordjeva snicla', dishes)).toBe('karadjordjeva');
  });

  it('prefers the most-specific dish when several match', () => {
    // "Punjena pljeskavica" contains both "pljeskavica" and "punjena pljeskavica".
    expect(matchDish('Punjena pljeskavica sa kajmakom', dishes)).toBe(
      'punjena-pljeskavica',
    );
    // Plain pljeskavica falls back to the generic dish.
    expect(matchDish('Pljeskavica', dishes)).toBe('pljeskavica');
  });

  it('requires ALL dish tokens to be present', () => {
    // "šnicla" alone must NOT match "karađorđeva šnicla" (missing a token).
    expect(matchDish('Bečka šnicla', dishes)).toBeNull();
  });

  it('returns null on no match or empty input', () => {
    expect(matchDish('Koka-kola 0.5', dishes)).toBeNull();
    expect(matchDish('   ', dishes)).toBeNull();
  });
});
