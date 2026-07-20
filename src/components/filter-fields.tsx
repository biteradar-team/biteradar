import {getTranslations} from 'next-intl/server';
import type {ReactNode} from 'react';
import {CITY_NAMES, type City} from '@/src/lib/cities';
import {PRICE_BANDS, priceBandLabel, type PriceBand} from '@/src/lib/prices';
import type {Cuisine} from '@/src/services/cuisines';

/*
 * Every control here is a real <input> styled through `peer-checked:`, never a
 * <button> with JS state. That is what keeps keyboard and screen-reader
 * behaviour the browser's, and what makes the no-JS GET fallback work: with
 * scripting off the form still submits these fields unchanged.
 *
 * All of them are server components — they never cross into the client bundle,
 * because `Filters` receives them as a already-rendered `fields` slot.
 */

// The input is visually hidden, so the focus ring has to be forwarded to the
// span — otherwise keyboard users can't see where they are.
const CHIP =
  'inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring';

/** Selected state for filters that narrow the list (paprika = brand accent). */
const CHIP_ON =
  'peer-checked:border-paprika peer-checked:bg-paprika peer-checked:font-medium peer-checked:text-white';

/** One `peer-checked:`-styled chip wrapping a hidden radio/checkbox. */
function Chip({
  name,
  value,
  checked,
  type,
  on = CHIP_ON,
  children,
}: {
  name: string;
  value?: string;
  checked: boolean;
  type: 'radio' | 'checkbox';
  on?: string;
  children: ReactNode;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <span className={`${CHIP} ${on}`}>{children}</span>
    </label>
  );
}

/** The NS/BG segmented control, previously copy-pasted into three pages. */
export default async function CityChips({selected}: {selected?: City}) {
  const t = await getTranslations('Home');

  const options = [
    {value: '', label: t('allCities')},
    {value: 'ns', label: CITY_NAMES.ns},
    {value: 'bg', label: CITY_NAMES.bg},
  ];

  return (
    <>
      {options.map((opt) => (
        <Chip
          key={opt.value || 'all'}
          type="radio"
          name="city"
          value={opt.value}
          checked={(selected ?? '') === opt.value}
        >
          {opt.label}
        </Chip>
      ))}
    </>
  );
}

/**
 * „Otvoreno sada". Green rather than paprika because green means exactly one
 * thing on this site (see `Pill`), and this is that thing.
 */
export async function OpenNowChip({checked}: {checked: boolean}) {
  const t = await getTranslations('Home');
  return (
    <Chip
      type="checkbox"
      name="openNow"
      checked={checked}
      on="peer-checked:border-open peer-checked:bg-open-tint peer-checked:font-medium peer-checked:text-open"
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t('openNow')}
    </Chip>
  );
}

/** „Otvoreno posle 23h" — the late-night preset (§3.1). */
export async function LateNightChip({checked}: {checked: boolean}) {
  const t = await getTranslations('Home');
  return (
    <Chip type="checkbox" name="late" checked={checked}>
      {t('lateNight')}
    </Chip>
  );
}

/** Card payment — the local differentiator Google doesn't track reliably (§3.1). */
export async function CardsChip({checked}: {checked: boolean}) {
  const t = await getTranslations('Home');
  return (
    <Chip type="checkbox" name="cards" checked={checked}>
      {t('cards')}
    </Chip>
  );
}

/**
 * Price band. Labels are built FROM `PRICE_BAND_MAX`, so the thresholds can be
 * retuned in one place without the UI quietly starting to lie.
 */
export async function PriceChips({selected}: {selected?: PriceBand}) {
  const t = await getTranslations('Home');

  return (
    <>
      <Chip type="radio" name="price" value="" checked={!selected}>
        {t('priceAny')}
      </Chip>
      {PRICE_BANDS.map((band) => {
        const {key, values} = priceBandLabel(band);
        return (
          <Chip
            key={band}
            type="radio"
            name="price"
            value={String(band)}
            checked={selected === band}
          >
            {t(key, values)}
          </Chip>
        );
      })}
    </>
  );
}

/**
 * Cuisine picker. A native <select>, not chips: ~8 cuisines would wrap into a
 * tall block next to the city chips on a phone, and a select fires `change` so
 * instant-apply and the no-JS submit both keep working untouched.
 *
 * Renders nothing when no cuisine has locations yet — same self-hiding rule as
 * the dish rail, so the control never appears empty.
 */
export async function CuisineSelect({
  cuisines,
  selected,
  locale,
}: {
  cuisines: Cuisine[];
  selected?: string;
  locale: string;
}) {
  const t = await getTranslations('Home');
  if (!cuisines.length) return null;

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{t('cuisineLabel')}</span>
      <select
        name="cuisine"
        defaultValue={selected ?? ''}
        className="cursor-pointer rounded-full border border-line-strong bg-card px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <option value="">{t('cuisineAll')}</option>
        {cuisines.map((c) => (
          <option key={c.slug} value={c.slug}>
            {locale === 'en' && c.nameEn ? c.nameEn : c.nameSr}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Submit button for the no-JS path. Hidden by default and un-hidden by the
 * <noscript> rule in `Filters` — with JS on, filters apply on change and a
 * submit button would be dead weight.
 */
export async function NoJsSubmit() {
  const t = await getTranslations('Home');
  return (
    <button
      type="submit"
      data-nojs=""
      className="hidden items-center rounded-md bg-paprika px-4 py-2 text-sm font-medium text-white"
    >
      {t('search')}
    </button>
  );
}
