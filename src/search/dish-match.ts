import {normalize} from './normalize';

/**
 * Auto-link a free-text menu item to a canonical dish (blueprint §3.1 — the
 * price-comparison differentiator needs items grouped under a canonical dish).
 *
 * A dish matches when ALL of its normalized-name tokens appear as whole words in
 * the item's normalized name (so "Ćevapi 10 kom" matches the dish "ćevapi", and
 * "Karađorđeva šnicla" matches "karađorđeva šnicla"). Among matches, the
 * MOST-SPECIFIC one wins — most tokens, then longest — so "punjena pljeskavica"
 * beats "pljeskavica" for an item that mentions both. `null` when nothing
 * matches confidently.
 *
 * Pure (matching on the NAME only, not the item's description) so it's precise
 * and unit-testable; lives in src/search alongside the rest of the §8 pipeline.
 */
export type DishCandidate = {id: string; normalizedName: string};

export function matchDish(
  itemName: string,
  dishes: DishCandidate[],
): string | null {
  const itemTokens = new Set(tokens(itemName));
  if (itemTokens.size === 0) return null;

  let best: {id: string; count: number; len: number} | null = null;
  for (const dish of dishes) {
    const dishTokens = tokens(dish.normalizedName);
    if (dishTokens.length === 0) continue;
    if (!dishTokens.every((t) => itemTokens.has(t))) continue;

    const cand = {id: dish.id, count: dishTokens.length, len: dish.normalizedName.length};
    if (
      !best ||
      cand.count > best.count ||
      (cand.count === best.count && cand.len > best.len)
    ) {
      best = cand;
    }
  }
  return best?.id ?? null;
}

// `normalize()` already lowercases, transliterates and folds diacritics; split
// on whitespace to get comparable word tokens. Applied to the item name here and
// pre-applied to dish names when they're seeded, so both sides fold identically.
function tokens(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}
