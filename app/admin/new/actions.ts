'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {ZodError} from 'zod';
import {requireAdmin} from '@/src/lib/auth';
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from '@/src/services/locations';

export type FormState = {error?: string};

/**
 * Server actions behind the /admin forms.
 *
 * GATE FIRST: `db` bypasses RLS, so `requireAdmin()` is the only thing standing
 * between a request and a write. It MUST run before anything else in every one
 * of these — before reading the payload (blueprint §5).
 */

export async function createLocationAction(
  _prev: FormState,
  payload: unknown,
): Promise<FormState> {
  await requireAdmin();

  let locationId: string;
  try {
    ({locationId} = await createLocation(payload));
  } catch (err) {
    return toFormError(err);
  }
  // redirect() throws NEXT_REDIRECT — must live outside the try/catch. Land on
  // the edit page so photos can be added right away (the create form has none).
  redirect(`/admin/${locationId}/edit`);
}

export async function updateLocationAction(
  locationId: string,
  _prev: FormState,
  payload: unknown,
): Promise<FormState> {
  await requireAdmin();

  try {
    await updateLocation(locationId, payload);
  } catch (err) {
    return toFormError(err);
  }
  redirect('/admin');
}

export async function deleteLocationAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const restaurantId = String(formData.get('restaurantId') ?? '');
  if (restaurantId) await deleteLocation(restaurantId);
  revalidatePath('/admin');
}

function toFormError(err: unknown): FormState {
  if (err instanceof ZodError) {
    return {error: err.issues.map((i) => i.message).join(' · ')};
  }
  console.error('location write failed:', err);
  return {error: 'Greška pri čuvanju. Pokušajte ponovo.'};
}
