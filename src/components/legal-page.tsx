import {PageHeader, PageShell} from './shell';

/** One section = a subheading and a body paragraph. Body allows `\n` line
 *  breaks (`whitespace-pre-line`) so a section can hold a short list. */
type Section = {h: string; p: string};

/**
 * Reading-width renderer for the static legal pages (privacy, terms). The copy
 * lives in the i18n message files as a `sections` array, so both pages share
 * this and differ only by namespace — no per-page layout to keep in sync.
 */
export function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro?: string;
  updated: string;
  sections: Section[];
}) {
  return (
    <PageShell width="narrow">
      <PageHeader title={title} intro={intro} />
      <p className="-mt-4 text-sm text-ink-muted">{updated}</p>
      <div className="flex flex-col gap-6">
        {sections.map((s, i) => (
          <section key={i} className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-ink">{s.h}</h2>
            <p className="text-[15px] whitespace-pre-line text-ink-muted">
              {s.p}
            </p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
