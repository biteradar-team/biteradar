import {routing} from '@/src/i18n/routing';
import {CITY_NAMES} from '@/src/lib/cities';
import {siteUrl} from '@/src/lib/site';
import type {DishOffer} from '@/src/services/dishes';
import type {PublicLocation, PublicLocationSummary} from '@/src/services/locations';

/**
 * schema.org JSON-LD builders (pure — return plain objects rendered by
 * <JsonLd>). Absolute URLs mirror the routing strategy (`as-needed`): sr has no
 * prefix, others get `/<locale>`.
 */

const SCHEMA_DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]; // index = opening_hours.day_of_week (0 = Sunday)

function absUrl(locale: string, path: string): string {
  return `${siteUrl()}${locale === routing.defaultLocale ? '' : `/${locale}`}${path}`;
}

/** Restaurant schema for a location profile (rich results: address, hours, geo). */
export function restaurantJsonLd(loc: PublicLocation, locale: string) {
  const prices = loc.menu.map((m) => m.priceRsd).filter((p) => p > 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: loc.location.label ? `${loc.brand.name} · ${loc.location.label}` : loc.brand.name,
    url: absUrl(locale, `/lokal/${loc.slug}`),
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.location.address,
      addressLocality: CITY_NAMES[loc.location.city],
      addressCountry: 'RS',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: loc.location.lat,
      longitude: loc.location.lng,
    },
    ...(loc.cuisines.length ? {servesCuisine: loc.cuisines} : {}),
    ...(loc.photos.length ? {image: loc.photos.map((p) => p.url)} : {}),
    ...(prices.length
      ? {priceRange: `${Math.min(...prices)}–${Math.max(...prices)} RSD`}
      : {}),
    ...(loc.location.acceptsCards !== 'unknown'
      ? {paymentAccepted: loc.location.acceptsCards === 'yes' ? 'Cash, Credit Card' : 'Cash'}
      : {}),
    openingHoursSpecification: loc.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAYS[h.day],
      opens: h.opensAt,
      closes: h.closesAt,
    })),
  };
}

/** ItemList of price offers for a dish page. */
export function dishOffersJsonLd(dishName: string, offers: DishOffer[], locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: dishName,
    itemListElement: offers.map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Offer',
        name: `${o.itemName} — ${o.brandName}`,
        url: absUrl(locale, `/lokal/${o.slug}`),
        ...(o.priceRsd !== null ? {price: o.priceRsd, priceCurrency: 'RSD'} : {}),
      },
    })),
  };
}

/** Light ItemList of location links for a listing page (home / city / cuisine). */
export function listingJsonLd(
  name: string,
  items: PublicLocationSummary[],
  locale: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absUrl(locale, `/lokal/${it.slug}`),
      name: it.brandName,
    })),
  };
}
