'use client';
import Link from 'next/link';
import {useActionState, useState} from 'react';
import {createLocationAction, type FormState} from './actions';

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

export default function LocationForm() {
  const [state, formAction, pending] = useActionState<FormState, unknown>(
    createLocationAction,
    {},
  );

  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [locLabel, setLocLabel] = useState('');
  const [city, setCity] = useState('ns');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [acceptsCards, setAcceptsCards] = useState('unknown');
  const [status, setStatus] = useState('draft');

  const [hours, setHours] = useState<HourRow[]>(
    DAYS.map(() => ({closed: true, opensAt: '', closesAt: ''})),
  );
  const [menu, setMenu] = useState<MenuRow[]>([
    {name: '', sectionName: '', description: '', priceRsd: ''},
  ]);

  function setHour(i: number, patch: Partial<HourRow>) {
    setHours((rows) => rows.map((r, j) => (j === i ? {...r, ...patch} : r)));
  }
  function setItem(i: number, patch: Partial<MenuRow>) {
    setMenu((rows) => rows.map((r, j) => (j === i ? {...r, ...patch} : r)));
  }

  function submit() {
    formAction({
      brand: {name: brandName, description},
      location: {label: locLabel, city, address, lat, lng, acceptsCards, status},
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
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Grad">
            <select
              className={input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="ns">Novi Sad</option>
              <option value="bg">Beograd</option>
            </select>
          </Field>
          <Field label="Lat *">
            <input
              className={input}
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
            />
          </Field>
          <Field label="Lng *">
            <input
              className={input}
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
            />
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
        </div>
        <Field label="Status">
          <select
            className={`${input} sm:w-48`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Nacrt (skriveno)</option>
            <option value="published">Objavljeno (vidljivo)</option>
          </select>
        </Field>
      </section>

      {/* Hours */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Radno vreme</h2>
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
                  <input
                    type="time"
                    className={`${input} w-32`}
                    value={row.opensAt}
                    onChange={(e) => setHour(i, {opensAt: e.target.value})}
                  />
                  <span className="text-zinc-500">–</span>
                  <input
                    type="time"
                    className={`${input} w-32`}
                    value={row.closesAt}
                    onChange={(e) => setHour(i, {closesAt: e.target.value})}
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
          {pending ? 'Čuvanje…' : 'Sačuvaj lokal'}
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
