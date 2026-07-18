/**
 * Serbian search normalization (blueprint §8, USVOJENO — the key differentiator).
 *
 * A visitor typing `cevapi`, `ćevapi`, or `ћевапи` — or `karadjordjeva` vs
 * `Карађорђева` — must hit the same rows. This module is the single source of
 * truth for that (CLAUDE.md: "normalization lives in src/search/"). Both the
 * stored `normalized_text` column and the incoming query run through
 * `normalize()`, so they compare on equal ground.
 *
 * NOTE: `ćevapi` and `ćevapčići` normalize to *different* strings
 * (`cevapi` / `cevapcici`) — they are not identical words. Their search-time
 * equivalence comes from trigram similarity (pg_trgm) and the synonym dict,
 * NOT from `normalize()`. Tests assert accordingly.
 */

// Serbian Cyrillic is fully phonetic; it maps cleanly onto Gaj's Latin
// alphabet. Lowercase only — `normalize()` lowercases first. Digraph letters
// (љ→lj, њ→nj, џ→dž, ђ→đ) expand to multiple latin chars.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z',
  и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'č', џ: 'dž', ш: 'š',
};

/**
 * Fold a string to its canonical searchable form: lowercase, script- and
 * diacritic-insensitive, latin, punctuation collapsed to single spaces.
 */
export function normalize(input: string): string {
  const lower = input.toLowerCase();

  // Cyrillic → Latin (keeping latin diacritics, folded in the next step).
  let out = '';
  for (const ch of lower) {
    out += CYRILLIC_TO_LATIN[ch] ?? ch;
  }

  // đ has no Unicode canonical decomposition, so NFD won't touch it — the §8
  // "ručno dj/đ" case. Map it manually before folding the rest. (dž → dz falls
  // out naturally once ž is stripped below.)
  out = out.replace(/đ/g, 'dj');

  // Fold remaining diacritics: ć→c č→c š→s ž→z, plus foreign accents (é, ü…)
  // that may appear in brand names.
  out = out.normalize('NFD').replace(/\p{Diacritic}/gu, '');

  // Everything that isn't a letter or digit becomes a single space.
  return out.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Query-side synonym dictionary (blueprint §8). Keys and values are already
 * normalized. Used to expand a search query — NOT applied to stored
 * `normalized_text`. Wired into the live query in the search-service slice
 * (step 7); kept here because it's pure, testable search data.
 */
export const SYNONYMS: Record<string, string[]> = buildSynonyms([
  ['burger', 'hamburger'],
  ['pomfrit', 'prženi krompir'],
  ['gluten free', 'bez glutena'],
]);

/** Return `term` plus any known synonyms (all normalized, deduped). */
export function expandSynonyms(term: string): string[] {
  const key = normalize(term);
  return [key, ...(SYNONYMS[key] ?? [])];
}

// Turn bidirectional pairs into a normalized lookup where every member points
// at all its partners.
function buildSynonyms(pairs: string[][]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const group of pairs) {
    const members = group.map(normalize);
    for (const m of members) {
      map[m] ??= new Set();
      for (const other of members) {
        if (other !== m) map[m].add(other);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, [...v]]),
  );
}
