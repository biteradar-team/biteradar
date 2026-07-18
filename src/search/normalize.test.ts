import {describe, expect, test} from 'vitest';
import {expandSynonyms, normalize} from './normalize';

describe('normalize', () => {
  // The blueprint §8 equivalence examples, verbatim.
  test('ćevapi / cevapi / ћевапи all collapse to "cevapi"', () => {
    expect(normalize('ćevapi')).toBe('cevapi');
    expect(normalize('cevapi')).toBe('cevapi');
    expect(normalize('ћевапи')).toBe('cevapi');
    expect(normalize('Ćevapi')).toBe('cevapi');
  });

  test('Ćevapčići / cevapcici / ћевапчићи all collapse to "cevapcici"', () => {
    expect(normalize('Ćevapčići')).toBe('cevapcici');
    expect(normalize('cevapcici')).toBe('cevapcici');
    expect(normalize('ћевапчићи')).toBe('cevapcici');
  });

  test('karađorđeva / karadjordjeva / Карађорђева all collapse', () => {
    expect(normalize('karađorđeva')).toBe('karadjordjeva');
    expect(normalize('karadjordjeva')).toBe('karadjordjeva');
    expect(normalize('Карађорђева')).toBe('karadjordjeva');
  });

  test('đ → dj (no Unicode decomposition)', () => {
    expect(normalize('Đevđelija')).toBe('djevdjelija');
    expect(normalize('ђ')).toBe('dj');
  });

  test('dž → dz, and lj/nj digraphs survive', () => {
    expect(normalize('džak')).toBe('dzak'); // latin digraph
    expect(normalize('џак')).toBe('dzak'); // cyrillic џ
    expect(normalize('Njegoš')).toBe('njegos');
    expect(normalize('његош')).toBe('njegos');
    expect(normalize('ljubav')).toBe('ljubav');
    expect(normalize('љубав')).toBe('ljubav');
  });

  test('other diacritics fold: č→c š→s ž→z', () => {
    expect(normalize('čварма')).toBe('cvarma'); // mixed, ч already covered
    expect(normalize('Šiš ćevap')).toBe('sis cevap');
    expect(normalize('žešće')).toBe('zesce');
  });

  test('punctuation and whitespace collapse to single spaces', () => {
    expect(normalize('  Pljeskavica,  extra! ')).toBe('pljeskavica extra');
    expect(normalize('a---b__c')).toBe('a b c');
  });

  test('empty / non-word input becomes ""', () => {
    expect(normalize('')).toBe('');
    expect(normalize('   ')).toBe('');
    expect(normalize('!!! ??? ...')).toBe('');
  });
});

describe('expandSynonyms', () => {
  test('is bidirectional and includes the term itself', () => {
    expect(expandSynonyms('burger')).toEqual(
      expect.arrayContaining(['burger', 'hamburger']),
    );
    expect(expandSynonyms('hamburger')).toEqual(
      expect.arrayContaining(['hamburger', 'burger']),
    );
  });

  test('normalizes the input term before lookup', () => {
    // "Bez glutena" (with caps/space) must resolve to the "gluten free" synonym.
    expect(expandSynonyms('Bez glutena')).toEqual(
      expect.arrayContaining(['bez glutena', 'gluten free']),
    );
  });

  test('unknown term returns just itself (normalized)', () => {
    expect(expandSynonyms('Ćevapi')).toEqual(['cevapi']);
  });
});
