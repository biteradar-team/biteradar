import {z} from 'zod';
import {normalize} from '../search/normalize';

/** Slug base from any name: reuse the search normalizer (lowercase/ascii/
 * deaccented, spaces collapsed) then spaces → hyphens. Pure, so it lives here
 * (not in the `server-only` write service) and vitest can exercise it. */
export function slugify(name: string): string {
  return normalize(name).replace(/\s+/g, '-');
}

/**
 * Validation for the admin "new location" form (blueprint §5: validacija svih
 * ulaza, USVOJENO). Shared by the client form and the server action, so the
 * same rules run in the browser and — authoritatively — on the server.
 *
 * The payload is one brand + one physical location + weekly hours + a menu.
 * See `createLocation` in ./locations.ts for how it's written.
 */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const acceptsCards = z
  .enum(['yes', 'no', 'unknown'])
  // null = "unknown" (not "doesn't accept") — matches the nullable DB column.
  .transform((v) => (v === 'unknown' ? null : v === 'yes'));

const hourRow = z.object({
  day: z.number().int().min(0).max(6), // 0 = Sunday … 6 = Saturday
  closed: z.boolean(),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
});

const menuItem = z.object({
  name: z.string().trim().min(1, 'Naziv stavke je obavezan'),
  sectionName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  priceRsd: z.coerce.number().int().nonnegative(),
});

export const LocationInputSchema = z.object({
  brand: z.object({
    name: z.string().trim().min(1, 'Naziv je obavezan'),
    description: z.string().trim().optional(),
  }),
  location: z.object({
    label: z.string().trim().optional(),
    city: z.enum(['ns', 'bg']),
    address: z.string().trim().min(1, 'Adresa je obavezna'),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    acceptsCards,
    status: z.enum(['draft', 'published']),
  }),
  // Always 7 rows (one per weekday); closed days carry no times.
  hours: z
    .array(hourRow)
    .superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (row.closed) return;
        for (const field of ['opensAt', 'closesAt'] as const) {
          if (!row[field] || !HHMM.test(row[field]!)) {
            ctx.addIssue({
              code: 'custom',
              path: [i, field],
              message: 'Unesite vreme (HH:MM)',
            });
          }
        }
      });
      // Past-midnight closes (closesAt < opensAt) are allowed — no check.
    }),
  menu: z.array(menuItem),
});

export type LocationInput = z.infer<typeof LocationInputSchema>;
