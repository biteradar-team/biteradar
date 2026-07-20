import type {ReactNode} from 'react';

/**
 * Small status chip. Replaces ~6 ad-hoc class strings, including the nested
 * three-way colour ternary that used to live in the profile page.
 *
 * `open` is green and, per the blueprint, green means "otvoreno sada" and
 * nothing else — don't reuse this variant for generic success states.
 */
const variants = {
  open: 'bg-open-tint text-open',
  warn: 'bg-warn-tint text-warn',
  brand: 'bg-paprika-tint text-paprika-accent',
  neutral: 'bg-raised text-ink-muted',
} as const;

export default function Pill({
  variant = 'neutral',
  children,
  className = '',
}: {
  variant?: keyof typeof variants;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {variant === 'open' ? (
        // A live dot, so "open now" reads at a glance without relying on colour
        // alone — the text is always there too.
        <span className="size-1.5 rounded-full bg-open" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
