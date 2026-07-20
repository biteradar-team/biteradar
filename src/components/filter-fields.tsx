import {getTranslations} from 'next-intl/server';
import {CITY_NAMES, type City} from '@/src/lib/cities';

/**
 * The NS/BG segmented control, previously copy-pasted into three pages.
 *
 * Still real radio inputs — the chips are styled with `peer-checked:`, so
 * keyboard and screen-reader behaviour is the browser's, and the whole thing
 * still submits correctly when JavaScript is off.
 */
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
        <label key={opt.value || 'all'} className="cursor-pointer">
          <input
            type="radio"
            name="city"
            value={opt.value}
            defaultChecked={(selected ?? '') === opt.value}
            className="peer sr-only"
          />
          {/*
            The input is visually hidden, so the focus ring has to be forwarded
            to this span — otherwise keyboard users can't see where they are.
          */}
          <span className="inline-block rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink peer-checked:border-paprika peer-checked:bg-paprika peer-checked:font-medium peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
            {opt.label}
          </span>
        </label>
      ))}
    </>
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
