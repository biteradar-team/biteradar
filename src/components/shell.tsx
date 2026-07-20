import type {ReactNode} from 'react';
import {Link} from '@/src/i18n/navigation';
import {ArrowLeftIcon} from './icons';

/**
 * The page container. Every public page had its own hand-written copy of this
 * (seven of them, with three different max-widths and two different gaps) —
 * this is that block, once.
 *
 * `wide` is for card grids, `narrow` for reading-width pages (profile, dish).
 * The id is the target of the header's skip link.
 */
export function PageShell({
  children,
  width = 'wide',
  className = '',
}: {
  children: ReactNode;
  width?: 'wide' | 'narrow';
  className?: string;
}) {
  const max = width === 'wide' ? 'max-w-6xl' : 'max-w-3xl';
  return (
    <main
      id="content"
      className={`mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 ${max} ${className}`}
    >
      {children}
    </main>
  );
}

/**
 * Title block shared by the city / dish / cuisine pages, which each had their
 * own near-identical copy. `back` renders the "← Sva jela" style link.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  back,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  back?: {href: string; label: string};
}) {
  return (
    <header className="flex flex-col gap-3">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" />
          {back.label}
        </Link>
      ) : null}

      {eyebrow ? (
        <p className="font-expanded text-[11px] font-semibold uppercase text-paprika-accent">
          {eyebrow}
        </p>
      ) : null}

      <h1 className="text-3xl font-bold text-balance sm:text-4xl">{title}</h1>

      {intro ? (
        <p className="max-w-prose text-[15px] text-ink-muted">{intro}</p>
      ) : null}
    </header>
  );
}

/**
 * A wrapped list of chip links — the /jela and /kuhinje index pages, which were
 * otherwise byte-identical twins.
 */
export function ChipLinks({
  items,
  hrefPrefix,
}: {
  items: {slug: string; nameSr: string}[];
  hrefPrefix: string;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            href={`${hrefPrefix}/${item.slug}`}
            className="inline-block rounded-full border border-line-strong px-4 py-2 text-sm text-ink transition-colors hover:border-paprika hover:bg-paprika hover:text-white"
          >
            {item.nameSr}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Empty-state paragraph. Six pages had their own copy of this one line. */
export function EmptyState({children}: {children: ReactNode}) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}
