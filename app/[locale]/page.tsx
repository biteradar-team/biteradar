import {use} from "react";
import {useTranslations} from "next-intl";
import {setRequestLocale} from "next-intl/server";

export default function Home({params}: PageProps<'/[locale]'>) {
  // Unwrap the async params in this (sync) Server Component so we can keep
  // the route statically rendered per locale.
  const {locale} = use(params);
  setRequestLocale(locale);

  // Reads from the "HomePage" namespace of the active locale's messages.
  // This single call is our proof that i18n is wired end-to-end.
  const t = useTranslations("HomePage");

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <h1 className="max-w-2xl text-center text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        {t("tagline")}
      </h1>
    </main>
  );
}
