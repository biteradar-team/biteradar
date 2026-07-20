/**
 * Tourist guides as data — blueprint §3.1/§13: the guide *route structure* ships
 * pre-launch, the articles are written after. So this is a plain typed array, not
 * an MDX pipeline or CMS: one seed stub now, more added by editing this file.
 *
 * Text is bilingual-keyed because both `/guides` (sr) and `/en/guides` render
 * from `app/[locale]` — a flat English string would put English body text under
 * Serbian chrome. Guide article text lives HERE, not in the i18n message files
 * (those hold UI chrome only).
 *
 * Plain data, no `server-only` imports — safe to import from page components.
 */
type Localized = {sr: string; en: string};

export type GuideSection = {
  heading: Localized;
  body: Localized;
  /** Links into the existing /jelo/[slug] price-comparison page. */
  dishSlug?: string;
  /** Links into an existing /lokal/[slug] profile. Data-dependent — only set
   *  when you know the slug exists. */
  locationSlug?: string;
};

export type Guide = {
  slug: string;
  title: Localized;
  intro: Localized;
  sections: GuideSection[];
};

// ponytail: content is a stub. The guides' SEO value is linking into our own
// dish/location pages, so sections reference canonical dish slugs (stable public
// URLs from seed-dishes.ts). Writing the full library is post-launch content
// work, not code — add guides by appending to this array.
export const GUIDES: Guide[] = [
  {
    slug: 'serbian-dishes-belgrade',
    title: {
      sr: '10 srpskih jela koja moraš probati u Beogradu — i gde',
      en: '10 Serbian dishes you must try in Belgrade — and where',
    },
    intro: {
      sr: 'Kratki vodič kroz klasike srpske kuhinje, sa linkovima na cene po lokalima.',
      en: 'A short guide to the classics of Serbian food, with links to prices across locations.',
    },
    sections: [
      {
        heading: {sr: 'Ćevapi', en: 'Ćevapi'},
        body: {
          sr: 'Roštiljski klasik broj jedan — mlevene kobasice od mesa, obično sa lepinjom, lukom i kajmakom. Uporedi cene po lokalima.',
          en: 'The number-one grill classic — grilled minced-meat rolls, usually served with flatbread, onion and kajmak. Compare prices across locations.',
        },
        dishSlug: 'cevapi',
      },
      {
        heading: {sr: 'Karađorđeva šnicla', en: 'Karađorđeva šnicla'},
        body: {
          sr: 'Pohovani rolat punjen kajmakom — obilan i tipično srpski. Pogledaj gde je najpovoljnija.',
          en: 'A breaded rolled cutlet stuffed with kajmak — hearty and unmistakably Serbian. See where it is cheapest.',
        },
        dishSlug: 'karadjordjeva',
      },
      {
        heading: {sr: 'Sarma', en: 'Sarma'},
        body: {
          sr: 'Sarmice od kiselog kupusa punjene mlevenim mesom i pirinčem — zimski favorit domaće kuhinje.',
          en: 'Sauerkraut leaves rolled around minced meat and rice — a winter favourite of home cooking.',
        },
        dishSlug: 'sarma',
      },
      {
        heading: {sr: 'Burek', en: 'Burek'},
        body: {
          sr: 'Pita od tankih kora, punjena mesom, sirom ili spanaćem — doručak iz pekare koji morate probati.',
          en: 'A pastry of thin layered dough filled with meat, cheese or spinach — the bakery breakfast you have to try.',
        },
        dishSlug: 'burek',
      },
    ],
  },
];

export const getGuideBySlug = (slug: string): Guide | undefined =>
  GUIDES.find((g) => g.slug === slug);
