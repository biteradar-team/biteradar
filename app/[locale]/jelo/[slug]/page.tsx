import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import JsonLd from '@/src/components/json-ld';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES, parseCity} from '@/src/lib/cities';
import {dishOffersJsonLd} from '@/src/lib/jsonld';
import {getDishBySlug, listDishOffers} from '@/src/services/dishes';

type Props = {
  params: Promise<{locale: string; slug: string}>;
  searchParams: Promise<{city?: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  const dish = await getDishBySlug(slug);
  if (!dish) return {title: 'BiteRadar'};
  const title = `${dish.nameSr} — cene po lokalima | BiteRadar`;
  const description = `Uporedi cene za ${dish.nameSr} u restoranima i lokalima — najjeftinije prvo, sa radnim vremenom i menijem na BiteRadaru.`;
  return {title, description, openGraph: {title, description}};
}

export default async function DishPage({params, searchParams}: Props) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const dish = await getDishBySlug(slug);
  if (!dish) notFound();

  const t = await getTranslations('Dish');
  const tl = await getTranslations('Location');
  const th = await getTranslations('Home');

  const city = parseCity((await searchParams).city);
  const offers = await listDishOffers({dishId: dish.id, city});

  const cityOptions: {value: string; label: string}[] = [
    {value: '', label: th('allCities')},
    {value: 'ns', label: CITY_NAMES.ns},
    {value: 'bg', label: CITY_NAMES.bg},
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10 text-black dark:text-zinc-100">
      {offers.length ? (
        <JsonLd data={dishOffersJsonLd(dish.nameSr, offers, locale)} />
      ) : null}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{dish.nameSr}</h1>
        {locale === 'en' && dish.nameEn ? (
          <p className="text-sm text-zinc-500">{dish.nameEn}</p>
        ) : null}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('intro', {dish: dish.nameSr})}
        </p>
        <Link href="/jela" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          {t('backToDishes')}
        </Link>
      </header>

      {/* City filter — no-JS GET form. */}
      <form method="get" className="flex flex-wrap items-center gap-2">
        {cityOptions.map((opt) => (
          <label key={opt.value || 'all'} className="cursor-pointer">
            <input
              type="radio"
              name="city"
              value={opt.value}
              defaultChecked={(city ?? '') === opt.value}
              className="peer sr-only"
            />
            <span className="inline-block rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 peer-checked:border-black peer-checked:bg-black peer-checked:text-white dark:border-zinc-700 dark:text-zinc-300 dark:peer-checked:border-zinc-100 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-black">
              {opt.label}
            </span>
          </label>
        ))}
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {th('search')}
        </button>
      </form>

      {offers.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('noOffers', {dish: dish.nameSr})}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
          {offers.map((o, i) => (
            <li key={`${o.slug}-${i}`}>
              <Link
                href={`/lokal/${o.slug}`}
                className="flex items-baseline justify-between gap-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {o.brandName}
                    {o.label ? <span className="text-zinc-500"> · {o.label}</span> : null}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {o.itemName} · {CITY_NAMES[o.city]}
                  </span>
                </div>
                <span className="whitespace-nowrap tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                  {o.priceRsd === null ? '—' : tl('priceRsd', {amount: o.priceRsd})}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
