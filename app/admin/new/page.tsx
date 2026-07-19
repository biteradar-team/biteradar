import type {Metadata} from 'next';
import Link from 'next/link';
import {requireAdmin} from '@/src/lib/auth';
import LocationForm from './location-form';

export const metadata: Metadata = {title: 'Novi lokal — BiteRadar Admin'};

export default async function NewLocationPage() {
  await requireAdmin();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Novi lokal
        </h1>
        <Link
          href="/admin"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          ← Nazad
        </Link>
      </div>
      <LocationForm />
    </main>
  );
}
