'use client';
import Link from 'next/link';
import {useActionState, useState} from 'react';
import {type LocationEditData} from '@/src/services/location-input';
import {type FormState} from './actions';
import MapPicker, {type Coords} from './map-picker';

type Action = (prev: FormState, payload: unknown) => Promise<FormState>;

// 0 = Sunday … 6 = Saturday, matching schema.opening_hours.day_of_week.
const DAYS = [
  'Nedelja',
  'Ponedeljak',
  'Utorak',
  'Sreda',
  'Četvrtak',
  'Petak',
  'Subota',
];

// 24h, 30-min steps: 00:00 … 23:30. A <select> (one tap, type-ahead, no AM/PM
// scroll) beats the native time picker for entering venue hours.
const TIME_OPTIONS = Array.from({length: 48}, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  return `${h}:${i % 2 ? '30' : '00'}`;
});

type HourRow = {closed: boolean; opensAt: string; closesAt: string};
type MenuRow = {
  name: string;
  sectionName: string;
  description: string;
  priceRsd: string;
};

const input =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
const label = 'text-xs font-medium text-zinc-600 dark:text-zinc-400';

export default function LocationForm({
  action,
  initial,
  submitLabel = 'Sačuvaj lokal',
}: {
  action: Action;
  initial?: LocationEditData;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, unknown>(
    action,
    {},
  );

  const [brandName, setBrandName] = useState(initial?.brand.name ?? '');
  const [description, setDescription] = useState(
    initial?.brand.description ?? '',
  );
  const [locLabel, setLocLabel] = useState(initial?.location.label ?? '');
  const [city, setCity] = useState<'ns' | 'bg'>(initial?.location.city ?? 'ns');
  const [address, setAddress] = useState(initial?.location.address ?? '');
  const [coords, setCoords] = useState<Coords | null>(
    initial ? {lat: initial.location.lat, lng: initial.location.lng} : null,
  );
  const [acceptsCards, setAcceptsCards] = useState<string>(
    initial?.location.acceptsCards ?? 'unknown',
  );
  const [status, setStatus] = useState<string>(
    initial?.location.status ?? 'draft',
  );

  // 7 rows keyed by weekday; edit fills open days, the rest default to closed.
  const [hours, setHours] = useState<HourRow[]>(() => {
    const open = new Map((initial?.hours ?? []).map((h) => [h.day, h]));
    return DAYS.map((_, day) => {
      const h = open.get(day);
      return h
        ? {closed: false, opensAt: h.opensAt, closesAt: h.closesAt}
        : {closed: true, opensAt: '', closesAt: ''};
    });
  });
  const [menu, setMenu] = useState<MenuRow[]>(
    initial && initial.menu.length
      ? initial.menu.map((m) => ({...m}))
      : [{name: '', sectionName: '', description: '', priceRsd: ''}],
  );

  // Bulk "set every day to these hours" — enter once, then tweak the odd days
  // (closed Sunday, longer weekend) by hand.
  const [bulkOpen, setBulkOpen] = useState('08:00');
  const [bulkClose, setBulkClose] = useState('22:00');
  function applyToAllDays() {
    setHours((rows) =>
      rows.map(() => ({closed: false, opensAt: bulkOpen, closesAt: bulkClose})),
    );
  }

  function setHour(i: number, patch: Partial<HourRow>) {
    setHours((rows) => rows.map((r, j) => (j === i ? {...r, ...patch} : r)));
  }
  function setItem(i: number, patch: Partial<MenuRow>) {
    setMenu((rows) => rows.map((r, j) => (j === i ? {...r, ...patch} : r)));
  }

  function submit() {
    formAction({
      brand: {name: brandName, description},
      location: {
        label: locLabel,
        city,
        address,
        lat: coords?.lat,
        lng: coords?.lng,
        acceptsCards,
        status,
      },
      hours: hours.map((h, day) => ({day, ...h})),
      menu,
    });
  }

  return (
    <form
      action={submit}
      className="flex flex-col gap-8 text-black dark:text-zinc-100"
    >
      {/* Brand */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Objekat</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Naziv *">
            <input
              className={input}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
            />
          </Field>
          <Field label="Oznaka lokala (npr. Liman)">
            <input
              className={input}
              value={locLabel}
              onChange={(e) => setLocLabel(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Opis">
          <textarea
            className={input}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </section>

      {/* Location */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Lokacija</h2>
        <Field label="Adresa *">
          <input
            className={input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Grad">
            <select
              className={input}
              value={city}
              onChange={(e) => setCity(e.target.value as 'ns' | 'bg')}
            >
              <option value="ns">Novi Sad</option>
              <option value="bg">Beograd</option>
            </select>
          </Field>
          <Field label="Prima kartice">
            <select
              className={input}
              value={acceptsCards}
              onChange={(e) => setAcceptsCards(e.target.value)}
            >
              <option value="unknown">Nepoznato</option>
              <option value="yes">Da</option>
              <option value="no">Ne</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              className={input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Nacrt (skriveno)</option>
              <option value="published">Objavljeno (vidljivo)</option>
            </select>
          </Field>
        </div>
        <MapPicker value={coords} onChange={setCoords} city={city} />
      </section>

      {/* Hours */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Radno vreme</h2>

        {/* Bulk apply: fill every day with one open/close, then adjust below. */}
        <div className="flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Postavi sve dane:
          </span>
          <TimeSelect value={bulkOpen} onChange={setBulkOpen} />
          <span className="text-zinc-500">–</span>
          <TimeSelect value={bulkClose} onChange={setBulkClose} />
          <button
            type="button"
            onClick={applyToAllDays}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Primeni na sve
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {hours.map((row, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-zinc-600 dark:text-zinc-400">
                {DAYS[i]}
              </span>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={row.closed}
                  onChange={(e) => setHour(i, {closed: e.target.checked})}
                />
                Zatvoreno
              </label>
              {!row.closed && (
                <>
                  <TimeSelect
                    value={row.opensAt}
                    onChange={(v) => setHour(i, {opensAt: v})}
                  />
                  <span className="text-zinc-500">–</span>
                  <TimeSelect
                    value={row.closesAt}
                    onChange={(v) => setHour(i, {closesAt: v})}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Menu */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Meni</h2>
        {menu.map((item, i) => (
          <div
            key={i}
            className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_2fr_1fr_auto]"
          >
            <Field label="Naziv *">
              <input
                className={input}
                value={item.name}
                onChange={(e) => setItem(i, {name: e.target.value})}
              />
            </Field>
            <Field label="Sekcija">
              <input
                className={input}
                value={item.sectionName}
                onChange={(e) => setItem(i, {sectionName: e.target.value})}
              />
            </Field>
            <Field label="Opis">
              <input
                className={input}
                value={item.description}
                onChange={(e) => setItem(i, {description: e.target.value})}
              />
            </Field>
            <Field label="Cena (RSD) *">
              <input
                className={input}
                type="number"
                min="0"
                value={item.priceRsd}
                onChange={(e) => setItem(i, {priceRsd: e.target.value})}
              />
            </Field>
            <button
              type="button"
              onClick={() => setMenu((m) => m.filter((_, j) => j !== i))}
              disabled={menu.length === 1}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Ukloni
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setMenu((m) => [
              ...m,
              {name: '', sectionName: '', description: '', priceRsd: ''},
            ])
          }
          className="self-start rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          + Dodaj stavku
        </button>
      </section>

      {state.error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? 'Čuvanje…' : submitLabel}
        </button>
        <Link
          href="/admin"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          Otkaži
        </Link>
      </div>
    </form>
  );
}

/** 24h time dropdown. Injects `value` if it's off the 30-min grid (e.g. an
 * existing 08:45) so editing a venue never silently drops its saved time. */
function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options =
    value && !TIME_OPTIONS.includes(value)
      ? [value, ...TIME_OPTIONS]
      : TIME_OPTIONS;
  return (
    <select
      className={`${input} w-24`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">--:--</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Field({
  label: text,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>{text}</span>
      {children}
    </label>
  );
}
