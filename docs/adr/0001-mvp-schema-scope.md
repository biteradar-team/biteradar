# ADR 0001: MVP schema scope i odstupanja od §7

## Status
Accepted

## Kontekst
Blueprint §7 propisuje pun model podataka, a §13 (korak 2) traži da se prvo
izgradi read-only MVP jezgro. §5 zahteva RLS na svakoj tabeli. Neke §7 tabele
su za MVP suvišne ili se jeftinije rešavaju kolonom / Storage funkcijom.
Odluke iz §5 su USVOJENO, pa svako odstupanje mora kroz ADR (CLAUDE.md).

Ovaj slice gradi 10 tabela (restaurants, restaurant_locations, opening_hours,
opening_hour_exceptions, cuisines, restaurant_cuisines, dishes, menu_items,
menu_item_prices, photos) + 2 enum-a, Drizzle migracije u repou, i anon-SELECT
RLS politike (pisanja su deny-by-default; samo service_role, koji zaobilazi RLS).

## Odluka
Odstupanja od §7 liste tabela za MVP:

1. **`menus` / `menu_sections` → `menu_items.section_name`** (tekstualna kolona).
   Jedan lokal = jedan implicitni meni; sekcija je labela na stavci.
2. **`location_features` → `restaurant_locations.accepts_cards`** (nullable bool).
   Jedini launch-relevantan flag (§3.1 lokalni diferencijator) je kolona.
3. **`photo_variants` → Supabase Storage image transforms.** Varijante se
   generišu na zahtev; tabela varijanti se ne vodi.
4. **Search kolone odložene** (`normalized_text`/`search_vector`, `unaccent`,
   `pg_trgm`) → sledeći slice (`src/search/`), da migracija ostane koherentna.
5. **Faza 2 tabele odložene**: `users`, `reviews`, `favorites`,
   `restaurant_claims`, `data_change_suggestions`, `audit_logs`.

Zadržano iz §7 bez promene: PostGIS `geography(Point,4326)` + GIST indeks;
restoran (brend) ≠ lokacija; cena vezana za lokaciju (kroz `menu_items`);
migracije u repou; RLS svuda.

## Alternative
- **Pun §7 model odmah** — više tabela bez podataka koji ih pune; krši launch
  liniju §3 i produžava slice bez MVP koristi.
- **`menus`/`menu_sections` kao tabele odmah** — opravdano tek kad lokal ima
  više menija (dnevni/à la carte); tada je to sopstveni ADR.

## Posledice
- Uži, koherentan MVP; brže do podataka (§2 „podaci SU proizvod").
- `section_name` ne podržava više menija po lokalu bez migracije.
- `accepts_cards` kao kolona: dodavanje novih flag-ova znači ili nove kolone ili
  prelazak na `location_features` tabelu.
- RLS pisanja deny-by-default: sav unos ide server-side sa service_role ključem
  (budući admin alat).

## Plan migracije
- **Više menija po lokalu**: uvesti `menus` (+ `menu_sections`), `menu_items`
  dobija `menu_id` fk; `section_name` se bekfiluje u sekcije. Non-breaking uz
  privremeno zadržavanje `section_name`.
- **Proliferacija flag-ova**: uvesti `location_features (location_id, key, value)`;
  migrirati `accepts_cards` u red, pa obrisati kolonu.
- **Search**: dodati kolone + `unaccent`/`pg_trgm` u zasebnoj migraciji (sledeći slice).
