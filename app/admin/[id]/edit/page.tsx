import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/src/lib/auth';
import {getLocationForEdit} from '@/src/services/locations';
import {updateLocationAction} from '../../new/actions';
import LocationForm from '../../new/location-form';

export const metadata: Metadata = {title: 'Izmena lokala — BiteRadar Admin'};

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  await requireAdmin();
  const {id} = await params;
  const initial = await getLocationForEdit(id);
  if (!initial) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Izmena lokala
        </h1>
        <Link
          href="/admin"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          ← Nazad
        </Link>
      </div>
      <LocationForm
        action={updateLocationAction.bind(null, id)}
        initial={initial}
        submitLabel="Sačuvaj izmene"
      />
    </main>
  );
}
