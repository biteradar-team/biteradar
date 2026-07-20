import type {Metadata} from "next";
import {Archivo, Geist, Geist_Mono} from "next/font/google";
import {notFound} from "next/navigation";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import SiteFooter from "@/src/components/site-footer";
import SiteHeader from "@/src/components/site-header";
import {routing} from "@/src/i18n/routing";
import {siteUrl} from "@/src/lib/site";
import "../globals.css";

// 'latin-ext' is required for Serbian latin diacritics (đ ć č š ž) — check any
// font swap against it, most display faces ship latin only.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

// The display face. `axes: ['wdth']` pulls Archivo's variable width axis
// (62–125) alongside weight — headings run semi-condensed and the wordmark runs
// expanded, which is where this design gets its character. Both set in
// globals.css via font-variation-settings.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

/*
  Applies the saved theme before first paint, so a light-mode user never sees a
  dark flash. It has to be a blocking inline script in <head>: anything deferred
  (or done in an effect) runs after the browser has already painted.

  Dark is the default when nothing is stored.
*/
const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem('theme')==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

const description =
  "Pretraga restorana i konkretnih jela po lokaciji, ceni, ukusu i radnom vremenu.";

export const metadata: Metadata = {
  // Makes relative canonical/OG URLs (e.g. per-page og:image) resolve absolute.
  metadataBase: new URL(siteUrl()),
  title: "BiteRadar",
  description,
  openGraph: {
    siteName: "BiteRadar",
    type: "website",
    title: "BiteRadar",
    description,
  },
};

// Pre-render both locales at build time (["sr", "en"]) rather than on the
// first request. Requires setRequestLocale() below to stay static.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  // In Next.js 16 route params are async and must be awaited.
  const {locale} = await params;

  // The [locale] segment behaves like a catch-all, so reject unknown values
  // (e.g. /foo.txt) with a 404 instead of rendering with a broken locale.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Opt this route into static rendering for the resolved locale.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      // The script above sets data-theme before React hydrates; without this,
      // React warns that the server markup didn't have the attribute.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: THEME_SCRIPT}} />
      </head>
      <body className="flex min-h-full flex-col">
        {/*
          Makes the current locale + messages available to Client Components.
          In next-intl v4 the provider inherits them from the request config,
          so we don't need to pass `messages`/`locale` explicitly here.
        */}
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
