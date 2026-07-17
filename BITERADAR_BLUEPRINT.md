# BiteRadar — tehnički blueprint (v2.1)

> **Status dokumenta:** važeća osnova + trenutno stanje / AI handoff (namenjeno i za Claude Code — drži ovaj fajl u repou)
> **Datum revizije:** 17. jul 2026. (spojen sa setup logom)
> **Zamenjuje:** FOOD_DISCOVERY_TECHNICAL_BLUEPRINT.md (v1) i FOOD_DISCOVERY_BLUEPRINT_V2.md
> **Primarna faza:** web sajt (read-only lansiranje)
> **Kasnija faza:** korisnički nalozi i recenzije, zatim iOS i Android
> **Ciljno početno tržište:** Novi Sad i Beograd (jedan osnivač u NS, ostali u BG — teren pokriven u oba grada)
> **Jezici:** srpski (primarni) + engleski (turisti), od prvog dana
> **Radni opis proizvoda:** „Google Maps za hranu" — pretraga restorana i konkretnih jela po lokaciji, ceni, ukusu, radnom vremenu i ocenama.

---

## TRENUTNO STANJE (setup log — 17. jul 2026.)

### ✔ Urađeno

- **GitHub:** organizacija `BiteRadar`, repo `biteradar-web` (javan — uslov za besplatan Vercel deploy), pozvan saradnik (Write), branch protection na `main` (obavezan PR + 1 approval, bez zaobilaženja), workflow: feature branch → PR → review → merge → brisanje grane.
- **Projekat:** `create-next-app` (TypeScript + Tailwind + ESLint + App Router), `@supabase/supabase-js`, `.env.local` (gitignore-ovan) + `.env.example` (commit-ovan, prazan), prvi commit na `main`.
- **Supabase:** organizacija BiteRadar (Free), projekat `biteradar`, region **eu-central-1 Frankfurt** (najbliži Srbiji), Data API uključen, „automatically expose new tables" ISKLJUČENO, automatski RLS UKLJUČEN (nove tabele zaključane dok se ne dodaju policy-ji). Publishable ključ u `NEXT_PUBLIC_SUPABASE_ANON_KEY`; secret ključ i DB lozinka NISU u repou ni u `.env.local` `NEXT_PUBLIC_` varijablama.
- **Vercel:** projekat BiteRadar (Hobby), import iz repoa, env varijable (Production + Preview), prvi deploy radi (`*.vercel.app`).

### Ključne reference

| Stavka | Vrednost |
|---|---|
| GitHub org / repo | BiteRadar / `biteradar-web` (javan) |
| Supabase projekat | `biteradar`, ID `lalilvhqqkigbykkwmqi` |
| Supabase URL | `https://lalilvhqqkigbykkwmqi.supabase.co` |
| Region | eu-central-1 (Frankfurt) |
| Vercel | projekat BiteRadar, Hobby plan |

### Napomene uz ovakav setup

- **Vercel Hobby je za nekomercijalnu upotrebu** — sasvim u redu do monetizacije (faza 2+), ali prelazak na Pro (20 $/mes.) ide NAJKASNIJE uz prvi dinar prihoda; Pro ujedno omogućava da repo ponovo postane privatan.
- Repo je javan: nikada ne commit-ovati ni testne podatke sa realnim ličnim informacijama; secret skener i `.env.example` disciplina ostaju obavezni.

### → Sledeći koraci (redom)

1. Kupiti domen(e): proveriti `biteradar.com` + `biteradar.rs`, povezati u Vercel → Settings → Domains.
2. Korak 1 iz redosleda izgradnje — ostatak: next-intl (sr/en), Sentry, CI (GitHub Actions).
3. Korak 2: Drizzle + šema jezgra (sekcija 7) + migracije + RLS policy-ji za javno čitanje `published` sadržaja.
4. Korak 3: sloj pretrage sa srpskom normalizacijom (sekcija 8) + unit testovi.
5. Korak 4: admin alat za unos → počinje unos podataka u NS i BG.

---

## 0. Šta se promenilo u odnosu na v1 i zašto

v1 je tehnički kvalitetan dokument, ali dimenzionisan za finansiran tim od 5+ ljudi.
Realnost: **2-3 studenta koji još uče TypeScript/React, budžet 20-50 €/mesečno, proizvod nije validiran.**

Ključne izmene:

1. **Podaci su pomereni na prvo mesto.** v1 je arhitekturu razradio detaljno, a izvor podataka ostavio kao otvoreno pitanje. Za discovery platformu podaci SU proizvod — prazan sajt sa savršenom arhitekturom ne vredi ništa.
2. **Jedan Next.js app umesto Next.js + NestJS + monorepo.** Odvojeni backend, generisan API klijent i contracts paket se uvode tek kada krene mobile.
3. **Supabase umesto ručno sastavljenog seta managed servisa.** Postgres + PostGIS + Auth + Storage u jednom, besplatno na startu.
4. **Redis i BullMQ izbačeni iz MVP-a.** Zamena: Postgres tabela za retke background poslove.
5. **MVP je read-only.** Nalozi, favoriti, recenzije i owner-submisije idu u fazu 2, tek kada postoji saobraćaj.
6. **i18n (sr + en) je obavezan od prvog dana** — naknadno uvođenje je bolno.

Sve dobre odluke iz v1 su zadržane i eksplicitno navedene u sekciji 5.

Konvencija iz v1 ostaje: **USVOJENO** / **PREFERIRANO** / **OTVORENO**.

---

## 1. Kontekst tima i ograničenja

**USVOJENO — sve tehničke odluke se mere prema ovome**

- tim: 2-3 osobe, studenti, rade uz fakultet;
- iskustvo: TypeScript/React na nivou „učimo, imamo osnovu";
- budžet: 20-50 €/mesečno maksimum dok se proizvod ne validira;
- teren: Novi Sad (jedan osnivač) i Beograd (ostali) — fotografisanje, provera radnog vremena i cena moguća uživo u oba grada;
- cilj prve faze: proveriti da li ljudi u NS i BG uopšte žele ovakav proizvod, uz minimalan trošak.

Posledica: **svaka tehnologija koja dodaje mesečni trošak, deployment ili koncept za učenje mora da opravda svoje postojanje u MVP-u.**

---

## 2. Strategija podataka (prioritet #1)

**USVOJENO — faznost**

Dugoročno važe sva tri izvora (interni unos, vlasnici, korisnici), ali NE istovremeno:

### Faza 1 — ručna kuracija (MVP)

- osnivači unose podatke sami, počev od sopstvenih omiljenih mesta;
- **dubina ispred širine**: 50 tačnih i ažurnih lokala u jednom delu grada vredi više od 500 polupraznih unosa širom Srbije;
- ciljna gustina pre lansiranja: ~100-150 kompletnih lokacija po gradu (naziv, adresa, koordinate, radno vreme, meni sa cenama, 2-3 fotografije);
- realna procena: 20-40 min po lokalu → planirati kao višenedeljni posao podeljen u timu;
- **interni admin alat za brz unos se pravi PRE javnog sajta** — tu će otići više radnih sati nego u javni deo;
- fotografije snimamo sami prilikom posete; **ne kopirati sa Google-a/Instagrama** (autorska prava);
- svaki podatak nosi `source`, `verified_at`, `updated_at`.

### Faza 2 — vlasnici i korisnici (posle lansiranja i prvog saobraćaja)

- korisnički predlozi izmena (stara vrednost, nova vrednost, dokaz, moderacija);
- claim flow za vlasnike („dokaži da si vlasnik") + owner dashboard za meni i cene;
- moderacioni workflow: `draft → pending_review → published / rejected → archived`.

Razlog redosleda: submisije zahtevaju naloge, verifikaciju i moderaciju (nedelje razvoja), a niko ne unosi podatke na prazan sajt — vlasnicima postajemo zanimljivi tek kada gosti stvarno traže lokale kod nas.

---

## 3. Scope po fazama: šta je na sajtu na dan lansiranja, a šta dolazi posle

**USVOJENO**

---

# ✅ PRE LANSIRANJA — sve ispod je dostupno korisnicima na dan launcha

---

### 3.1. MVP (read-only lansiranje)

- mapa + lista, izbor grada (NS/BG) ili trenutne lokacije;
- pretraga restorana I konkretnih jela (sa srpskom normalizacijom, v. sekciju 8);
- filteri: kuhinja, cenovni rang, udaljenost, „otvoreno sada", **plaćanje karticom/keš** (jedan boolean po lokaciji, a lokalni diferencijator — Google ovo ne prati pouzdano);
- preset filter **„otvoreno posle 23h"** (late-night mod — trivijalan jer podaci o radnom vremenu već postoje);
- profil lokala: radno vreme, meni sa cenama, fotografije, kontakt, mapa;
- SEO stranice (grad / kategorija / jelo / lokal), uključujući **uporedne cene jela** („ćevapi u Novom Sadu po ceni") — pada direktno iz modela podataka, niko drugi ne može da renderuje tu stranicu;
- **„provereno pre X dana" bedževi** na ceni i radnom vremenu (prikaz `verified_at`) — pretvara ručnu kuraciju u vidljivo poverenje, tačno tamo gde je Google Maps lokalno najslabiji;
- **EN turistički vodiči** — statične stranice tipa „10 Serbian dishes you must try in Belgrade — and where" koje linkuju na profile lokala; jeftin, evergreen SEO za tursku publiku (mogu se pisati i posle lansiranja, ali struktura ruta ide odmah);
- sr + en interfejs;
- interni admin alat za unos i izmene;
- osnovni analytics događaji (pretrage, klikovi, zero-result upiti);
- dugme „prijavi netačan podatak" (može biti običan mailto/form — bez naloga).

---

# 🚀 LINIJA LANSIRANJA
# ⏳ POSLE LANSIRANJA — ništa ispod ove linije se NE gradi pre launcha

Pravilo: ako neka stavka odozdo počne da se gradi pre lansiranja, to je scope creep i pomera datum launcha. Jedini izuzetak: skiciranje šeme baze za buduće funkcionalnosti (jeftino sada, skupo kasnije).

---

### 3.2. Faza 2 — prvi meseci posle lansiranja, redom po validaciji

- **„Šta da jedem?" swipe mod** — vertikalni full-screen feed fotografija jela (cena, udaljenost, „otvoreno sada"; swipe = sledeće, tap = profil lokala). **Odluka: sav browsing sadržaj je isključivo fotografski — video se ne uvodi** (trošak storage/transcoding/bandwidth + nerešiv supply problem za mali tim). Koristi fotografije koje već imamo; **prvi kandidat odmah posle lansiranja** jer rešava stvarni problem „ne znam šta hoću";
- **dnevni meni** — owner funkcionalnost: „objavi današnji meni za 30 sekundi". Dnevni menu je ogroman lokalni use case koji online niko ne pokriva; ujedno glavni mamac za claim profila jer vlasniku daje svakodnevnu vrednost. Zahteva claim flow, zato faza 2;
- korisnički nalozi (Supabase Auth: email + Google);
- favoriti;
- recenzije i ocene (model ocena razraditi tada — v. otvorena pitanja);
- korisnički predlozi izmena + moderacija;
- claim restorana + owner dashboard.

### 3.3. Faza 3+ — tek sa dokazanim tractionom

- React Native + Expo aplikacije (tek tada se izdvaja API — v. sekciju 12);
- push notifikacije, kolekcije, društvene funkcije, personalizacija, rezervacije, monetizacija.

---

## 4. Tehnološki stack v2

| Sloj | Izbor | Status |
|---|---|---|
| Jezik | TypeScript | **USVOJENO** |
| Aplikacija | Jedan Next.js app (public + admin + API route handlers) | **USVOJENO** |
| UI | Tailwind CSS + shadcn/ui | **PREFERIRANO** |
| i18n | next-intl, `sr` default + `/en` rute | **USVOJENO** |
| Baza | Supabase (managed PostgreSQL + PostGIS) | **USVOJENO** |
| ORM | Drizzle + parametrizovani raw SQL za geo/search | **USVOJENO** (iz v1) |
| Pretraga | PostgreSQL FTS + `pg_trgm` + `unaccent` + lat/ćir normalizacija | **USVOJENO** (iz v1) |
| Auth (faza 2) | Supabase Auth | **USVOJENO** |
| Storage slika | Supabase Storage (S3-kompatibilan) iza internog adaptera | **USVOJENO** |
| Mapa | MapLibre GL JS + MapTiler free tier | **USVOJENO** |
| Background poslovi | Postgres job tabela + cron (Vercel cron ili pg_cron) | **USVOJENO za MVP** |
| Hosting | Vercel (Hobby sada → Pro pri monetizaciji ili povratku na privatan repo) | **USVOJENO** |
| Greške | Sentry free tier | **USVOJENO** |
| Analytics | Plausible/Umami self-host ili Postgres event tabela | **OTVORENO** |
| Mobile kasnije | React Native + Expo, uz tada izdvojen API | **PREFERIRANO** (iz v1) |

**Izbačeno iz MVP-a** (ne zauvek — v. sekciju 12): NestJS, Fastify, monorepo/Turborepo, Redis, BullMQ, OpenSearch, Cloud Run, OpenTelemetry stack, Terraform.

### 4.1. Procena mesečnog troška

| Stavka | Trošak |
|---|---|
| Vercel Hobby | 0 € (Pro 20 $/mes. tek uz monetizaciju) |
| Supabase | 0 € (free tier) → 25 $ kad zatreba |
| MapTiler | 0 € (100k map loads/mes.) |
| Sentry | 0 € (free tier) |
| Domen | ~15 €/god. |
| **Ukupno na startu** | **~5-25 €/mes.** |

Unutar budžeta, sa prostorom za rast.

---

## 5. Odluke iz v1 koje ostaju na snazi

**USVOJENO — ne menjati bez ADR-a**

- PostgreSQL je jedini source of truth;
- PostGIS `geography(Point, 4326)` + GIST indeks za lokacije;
- **restoran (brend) ≠ lokacija (fizički objekat)** — dva entiteta;
- Postgres pretraga pre OpenSearch-a;
- slike se ne čuvaju u bazi; direktan upload u storage; EXIF/GPS se briše; nasumični object key;
- MapLibre; javni OSM tile server se NE koristi u produkciji;
- migracije u repou, kroz CI, bez ručnih izmena šeme;
- cursor pagination za velike kolekcije; validacija svih ulaza; standardan format grešaka;
- autorizacija se proverava na serveru, nikad samo u UI-ju;
- sponzorisani sadržaj (kad jednom postoji) mora biti jasno označen;
- lista „ne pretpostavljaj" iz v1 (sekcija 16 ovde).

---

## 6. Arhitektura MVP aplikacije

**USVOJENO**

Jedan Next.js app, ali sa disciplinom koja omogućava kasnije izdvajanje API-ja:

```text
app/
  (public)/            # javne stranice, sr default
  en/                  # ili middleware-based locale routing kroz next-intl
  admin/               # interni alat za unos, iza login-a
  api/                 # route handlers — tanki, zovu servise
src/
  services/            # SVA poslovna logika (restaurants, search, media…)
  db/                  # Drizzle šema, migracije, query helpers
  search/              # normalizacija, transliteracija, ranking
  i18n/                # poruke sr/en
  lib/                 # adapteri (storage, geocoding, mape)
```

Pravila (zamena za v1 granice monorepa):

- poslovna logika živi u `services/`, nikad u React komponentama ni direktno u route handlerima;
- route handleri i server akcije su tanki omotači oko servisa;
- spoljni provajderi (storage, geocoding, tiles) iza internih interfejsa/adaptera;
- API response tipovi nisu automatski isto što i DB modeli.

Ovo garantuje da izdvajanje pravog API-ja za mobile bude refaktor, ne rewrite.

---

## 7. Model podataka (MVP jezgro)

**USVOJENO kao polazna tačka**

```text
restaurants               # brend
restaurant_locations      # fizički objekat, PostGIS point
opening_hours
opening_hour_exceptions
location_contacts
location_features         # parking, bašta, wifi, plaćanje karticom…

cuisines
restaurant_cuisines
tags
dish_tags

dishes                    # kanonsko jelo („smash burger")
menus
menu_sections
menu_items                # konkretna stavka na konkretnoj lokaciji
menu_item_prices          # cena vezana za LOKACIJU, sa istorijom

photos
photo_variants

data_change_suggestions   # faza 2, ali šemu planirati odmah
audit_logs
search_events / view_events
```

Napomene:

- cena se vezuje za lokaciju (lanci imaju različite cene) — v1 pitanje br. 11, ovim zaključeno: **USVOJENO**;
- `users`, `reviews`, `favorites`, `restaurant_claims` — šeme skicirati, implementirati u fazi 2;
- svaki „živi" podatak: `source`, `verified_at`, `updated_at`, `confidence`;
- indeksi po v1 pravilima: GIST za geo, GIN za tsvector/trigram, B-tree + partial (`WHERE status = 'published'`) po stvarnim upitima — meriti sa `EXPLAIN (ANALYZE, BUFFERS)`.

---

## 8. Pretraga i srpski jezik

**USVOJENO — ključni diferencijator, prenosi se iz v1 bez skraćivanja**

Pretraga mora da razume:

```text
ćevapi = cevapi = ćevapčići = cevapcici = ћевапи
karađorđeva = karadjordjeva = Карађорђева
```

Za pretražive entitete čuvati/izračunavati: `original_text`, `normalized_text` (lowercase, bez dijakritika, latinica), `search_vector`.

Slojevi normalizacije: lowercase → whitespace/interpunkcija → dijakritika (`unaccent` + ručno dj/đ, dž, lj, nj) → ćirilica→latinica transliteracija → sinonimi (ručni rečnik: burger↔hamburger, pomfrit↔prženi krompir, gluten free↔bez glutena…) → typo tolerance (`pg_trgm`).

Ranking (početna ponderisana formula): text match + udaljenost + „otvoreno sada" + popularnost. Formulu verzionisati; search događaji beleže korišćenu verziju; zero-result upiti se loguju (direktan signal šta nedostaje u bazi podataka).

OpenSearch: tek kada merenja pokažu da Postgres ne može (v1 kriterijumi važe).

---

## 9. Internacionalizacija (novo u odnosu na v1)

**USVOJENO**

- next-intl od prvog commita; `sr` default bez prefiksa, engleski na `/en/...`;
- **pismo:** interfejs na srpskoj latinici; ćirilična verzija UI-ja = **OTVORENO** (toggle posle MVP-a); pretraga razume oba pisma od prvog dana (sekcija 8);
- šta se prevodi: UI kompletno; nazivi jela ostaju u originalu uz englesku kategorizaciju („ćevapi — grilled minced meat"); opisi lokala po mogućnosti; recenzije (faza 2) se ne prevode;
- SEO: `hreflang` sr/en, odvojeni sitemap-ovi, canonical po jeziku;
- slugovi ostaju latinični i stabilni (`/restoran/:slug`, `/en/restaurant/:slug`).

---

## 10. Slike, mape, hosting — operativna pravila

### Slike (pojednostavljeno iz v1)

- upload direktno u Supabase Storage (signed URL) iz admin alata;
- obrada: brisanje EXIF/GPS, provera magic bytes, generisanje varijanti `thumb-160 / card-480 / detail-960` u WebP;
- u MVP-u obrada može ići sinhrono pri unosu (unosi samo tim) — queue tek u fazi 2;
- original nije javno dostupan; javne varijante preko CDN-a (Supabase/Vercel CDN pokriva).

### Mape

- MapLibre GL JS + MapTiler free tier (adapter, provajder zamenljiv);
- viewport API: `GET /api/map/locations?north&south&east&west&zoom&filters` — nikad „svi lokali u gradu";
- geocoding: u MVP-u praktično nepotreban kao servis — koordinate se unose u admin alatu (pin na mapi); provajder se bira u fazi 2 (**OTVORENO**, v1 kriterijumi važe).

### Hosting i environmenti

- environmenti: `local` + `production`; `staging` tek kada postoje korisnici čiji podaci mogu da stradaju;
- CI (GitHub Actions): install → lint → typecheck → testovi → build → migracije → deploy;
- backup: Supabase daily backup uključen od prvog dana; **restore probati bar jednom pre lansiranja** („backup postoji" ≠ „backup radi");
- ne logovati tokene, lozinke, kompletne signed URL-ove.

---

## 11. Observability i testiranje (lite verzija)

**USVOJENO**

- Sentry za greške (frontend + server) — obavezno;
- strukturirani logovi sa `request_id`;
- metrike koje se stvarno gledaju: p95 latencija pretrage, zero-result rate, error rate, broj kompletnih lokacija, % menija sa cenama, starost `verified_at` podataka;
- testovi: unit za `search/` normalizaciju (najviše vrednosti po uloženom satu!), integracioni protiv pravog Postgres+PostGIS (Testcontainers ili Supabase local; SQLite NIJE zamena), par Playwright E2E tokova (pretraga jela; filter cena+udaljenost+otvoreno; otvaranje profila);
- pun OpenTelemetry stack: kasnije.

---

## 12. Putanja nazad ka v1 arhitekturi (okidači)

**USVOJENO — ništa od ovoga se ne uvodi „za svaki slučaj"**

| Okidač | Tada uvesti |
|---|---|
| Kreće mobile razvoj | izdvajanje `services/` u zaseban API (tek tada NestJS ili Hono + OpenAPI), monorepo |
| Izmerena spora pretraga / potrebe autocomplete-a koje PG ne pokriva | OpenSearch (outbox, reindeksiranje, blue/green indeksi po v1) |
| Realan obim background poslova (moderacija, notifikacije, import) | Redis + BullMQ |
| Saobraćaj koji free/low tier ne drži | Supabase Pro, više instanci, connection pooling (PgBouncer/Supavisor), read replika |
| Faza 2 submisije | moderacioni workflow, claim flow, rate limiting |

I dalje se NE gradi prerano (iz v1): mikroservisi, sopstveni tile/geocoding sistem, ML ranking, event streaming, rezervacije, delivery, payment, multi-region, Kubernetes.

---

## 13. Redosled izgradnje

### ✅ Pre lansiranja

1. ✔ delimično — Repo + Next.js + TypeScript + Tailwind gotovo (v. Trenutno stanje); ostaje: next-intl (sr/en), Sentry, CI.
2. ✔ delimično — Supabase projekat kreiran (Frankfurt, RLS default-on); ostaje: Drizzle šema jezgra (sekcija 7), migracije, RLS policy-ji.
3. Sloj pretrage: normalizacija + transliteracija + FTS, sa unit testovima.
4. **Admin alat za unos** (forma lokala, pin na mapi, meni sa cenama, upload slika).
5. Paralelno: početak unosa podataka u NS i BG (svako svoj grad) dok se gradi javni deo.
6. Javne stranice: profil lokala, grad/kategorija/jelo landing stranice, SEO metadata + sitemap.
7. Pretraga + filteri + mapa (viewport API, MapLibre).
8. „Prijavi netačan podatak", analytics događaji, prvi EN turistički vodiči, poliranje performansi.

### 🚀 Lansiranje

9. Soft lansiranje: podeliti prijateljima/fakultetu u NS i BG, meriti zero-result upite i retention.

### ⏳ Posle lansiranja

10. Tek posle validacije: faza 2 (swipe mod, nalozi, favoriti, recenzije, submisije, dnevni meni).

---

## 14. Monetizacija

**USVOJENO — principi sada, implementacija tek u fazi 2+**

### Zlatno pravilo

Korisnička strana je besplatna i kompletna zauvek. Novac dolazi isključivo sa strane vlasnika, i to za **dodatnu vidljivost i alate — nikada za tačnost ili kompletnost osnovnih podataka** (radno vreme, meni, cene). Onog trenutka kada se osnovni podaci nađu iza paywalla, obećanje „tačni podaci" umire — a s njim i proizvod.

### Kada počinje

Ne na lansiranju. Okidač: faza 2, kada postoji claim flow, vlasnici aktivno koriste profile i **sami počnu da traže dodatne mogućnosti**. Registracija firme/preduzetnika i fiskalna administracija idu tek tada — ne pre prvog realnog kupca.

### Lestvica modela

1. **Owner freemium — primarni model.**
   - besplatno zauvek: kompletan, tačan listing (u našem je interesu — kompletnost podataka JE proizvod);
   - plaćeni paket, po lokalno realnim cenama (par hiljada dinara mesečno, ne SaaS cene za Silicijumsku dolinu): dnevni meni, objave specijala i događaja, dodatni foto slotovi, analitika za vlasnike („47 ljudi je tražilo 'burger' u krugu od 500 m ove nedelje — 12 je otvorilo tvoj profil"). Analitika pada direktno iz `search_events` / `view_events` koje već beležimo — nula dodatnog troška, a niko drugi ne može to da kaže vlasniku kafane;
   - test za svaku plaćenu funkcionalnost: **da li sajt čini bogatijim za korisnike?** Ako ne — ne ulazi u ponudu.
2. **Označeni sponzorisani slotovi — drugi sloj.** Vizuelno jasno označeno, najviše jedan slot po pretrazi, organski ranking netaknut. Anti-primer koji ne smemo postati: Yelp i reputacija „ne plaćaš — sakriju te", koja im je trovala odnose sa vlasnicima deceniju.
3. **Kasnije, eventualno:** affiliate / provizija na rezervacije — razrađivati tek sa dokazanim obimom.

### Trajno zabranjeno

- skriveni pay-for-ranking;
- naplata uklanjanja ili zakopavanja loših recenzija (trenutna smrt kredibiliteta — i uvek se otkrije);
- baner ad mreže (zarada je sitniš, sajt deluje jeftino i usporava se);
- prodaja korisničkih podataka (ZZPL/GDPR rizik + samoubistvo poverenja).

### Sekvenca za dnevni meni

Na startu faze 2 dnevni meni je **besplatan** — on je mamac za claim profila i dnevnu naviku vlasnika. Naplata se uvodi kasnije, na amplifikaciju (isticanje, notifikacije pratiocima), kada navika već postoji. Freemium radi tako što naviku poklanja, a naplaćuje pojačanje.

---

## 15. Otvorena pitanja (ažurirana lista)

### Pre početka koda

- hosting: **REŠENO** — Vercel Hobby (v. Trenutno stanje);
- tačna ciljna gustina podataka za lansiranje (100? 150? po gradu) i podela posla u timu;
- naziv: **BiteRadar — USVOJENO.** Poznata kolizija: istoimena aplikacija za prognozu ribolova na Google Play-u (druga kategorija, nizak pravni rizik, ali smeta discoverability-ju u store-u i na Google-u u početku). Ostaje: ODMAH proveriti i registrovati biteradar.com i biteradar.rs (pre bilo čega drugog — preimenovanje posle lansiranja je mnogo skuplje od dva domena);
- brend: logo, boje, ton komunikacije (**OTVORENO**, nije bloker za početak koda).

### Pre lansiranja

- politika privatnosti + uslovi korišćenja (ZZPL/GDPR nivo za analytics bez naloga je mali, ali mora postojati);
- cookie consent ako analytics to zahteva (Plausible/Umami bez cookies ga izbegava);
- pravila prikaza „otvoreno sada" oko ponoći i praznika (v1 pitanje 19 — rešiti u kodu radnog vremena od starta).

### Faza 2 (razraditi tada, ne sada)

- model ocena (dimenzije, Bayesian korekcija, šta se ocenjuje: lokacija ili jelo);
- verifikacija vlasnika; sukob vlasnik vs korisnička prijava;
- anti-abuse za recenzije;
- monetizacija — principi i model su zaključeni u sekciji 14; ovde ostaje samo tajming i cenovnik (tek sa dokazanim saobraćajem i vlasnicima koji traže više).

---

## 16. Ne pretpostavljaj (iz v1, važi i dalje)

- da svi restorani imaju tačne digitalne menije;
- da su Google/Instagram podaci slobodni za kopiranje — **nisu**;
- da je prosečna ocena dovoljna;
- da javni OSM tile server sme u produkciju;
- da će AI rešiti loše ulazne podatke;
- da se „otvoreno sada" računa bez izuzetaka i timezone pravila;
- da su cene iste na svim lokacijama lanca;
- **novo:** da će vlasnici/korisnici unositi podatke pre nego što sajt ima posetioce.

---

## 17. ADR šablon (nepromenjen)

Za svaku veću promenu: `docs/adr/NNNN-naziv-odluke.md`

```md
# ADR NNNN: Naziv odluke
## Status
Proposed / Accepted / Superseded / Rejected
## Kontekst
## Odluka
## Alternative
## Posledice
## Plan migracije
```

---

## 18. Instrukcije sledećem AI agentu

Koristi ovaj dokument (v2) kao važeću osnovu; v1 je referenca za detalje skaliranja koji su ovde namerno odloženi.

Ne menjaj bez ADR-a: jedan Next.js app za MVP; Supabase (Postgres+PostGIS+Auth+Storage); Drizzle + raw SQL; PG pretraga sa srpskom normalizacijom; MapLibre; restoran ≠ lokacija; cena vezana za lokaciju; read-only MVP; podaci pre funkcionalnosti; i18n sr/en od prvog dana; budžet ≤ 50 €/mes.

Predlozi funkcionalnosti i dalje po v1 formatu (problem, ciljna grupa, MVP da/ne, tok, entiteti, API, rizici, moderacija, privatnost, metrika, složenost, zavisnosti) — uz dodatno pitanje: **„da li ovo može da sačeka fazu 2?"** Podrazumevani odgovor je da.
