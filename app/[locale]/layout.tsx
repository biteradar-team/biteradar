import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import {notFound} from "next/navigation";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import {routing} from "@/src/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BiteRadar",
  description:
    "Pretraga restorana i konkretnih jela po lokaciji, ceni, ukusu i radnom vremenu.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Makes the current locale + messages available to Client Components.
          In next-intl v4 the provider inherits them from the request config,
          so we don't need to pass `messages`/`locale` explicitly here.
        */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
