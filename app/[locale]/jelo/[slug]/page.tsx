import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import CityChips, {NoJsSubmit} from '@/src/components/filter-fields';
import Filters from '@/src/components/filters';
import JsonLd from '@/src/components/json-ld';
import Pill from '@/src/components/pill';
import {EmptyState, PageHeader, PageShell} from '@/src/components/shell';
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

  // The query already sorts `price asc nulls last`, so the first priced row is
  // the cheapest. Offers with no price sink to the bottom and are never marked.
  const cheapestIndex = offers.findIndex((o) => o.priceRsd !== null);

  return (
    <PageShell width="narrow">
      {offers.length ? (
        <JsonLd data={dishOffersJsonLd(dish.nameSr, offers, locale)} />
      ) : null}

      <PageHeader
        back={{href: '/jela', label: t('backToDishes')}}
        eyebrow={locale === 'en' && dish.nameEn ? dish.nameEn : undefined}
        title={dish.nameSr}
        intro={t('intro', {dish: dish.nameSr})}
      />

      <Filters
        className="flex flex-wrap items-center gap-2"
        busyLabel={th('filtering')}
        fields={
          <>
            <CityChips selected={city} />
            <NoJsSubmit />
          </>
        }
      >
        {offers.length === 0 ? (
          <EmptyState>{t('noOffers', {dish: dish.nameSr})}</EmptyState>
        ) : (
          /*
            The price ladder — the page this whole product exists for. Prices are
            set in tabular mono so the digits line up into a column you can scan
            without reading, and the cheapest row carries a paprika rail.

            The rank number is real information here (it IS the price order),
            which is why this page is numbered and no other list on the site is.
          */
          <ol className="overflow-hidden rounded-xl border border-line bg-card">
            {offers.map((o, i) => {
              const isCheapest = i === cheapestIndex;
              return (
                <li
                  key={`${o.slug}-${i}`}
                  className="border-b border-line last:border-b-0"
                >
                  <Link
                    href={`/lokal/${o.slug}`}
                    className={`flex items-center gap-3 border-l-2 py-3.5 pl-3 pr-4 transition-colors hover:bg-raised sm:gap-4 ${
                      isCheapest
                        ? 'border-l-paprika bg-paprika-tint/40'
                        : 'border-l-transparent'
                    }`}
                  >
                    <span className="num w-5 shrink-0 text-center text-sm text-ink-muted">
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {o.brandName}
                        {o.label ? (
                          <span className="font-normal text-ink-muted">
                            {' '}
                            · {o.label}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {o.itemName} · {CITY_NAMES[o.city]}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {o.priceRsd === null ? (
                        <span className="text-sm text-ink-muted">
                          {t('noPrice')}
                        </span>
                      ) : (
                        <span
                          className={`num whitespace-nowrap text-lg font-semibold ${
                            isCheapest ? 'text-paprika-accent' : 'text-ink'
                          }`}
                        >
                          {tl('priceRsd', {amount: o.priceRsd})}
                        </span>
                      )}
                      {isCheapest ? (
                        <Pill variant="brand">{t('cheapest')}</Pill>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </Filters>
    </PageShell>
  );
}
