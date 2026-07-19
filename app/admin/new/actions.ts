'use server';
import {redirect} from 'next/navigation';
import {ZodError} from 'zod';
import {requireAdmin} from '@/src/lib/auth';
import {createLocation} from '@/src/services/locations';

export type FormState = {error?: string};

/**
 * Server action behind the /admin/new form.
 *
 * GATE FIRST: `db` bypasses RLS, so `requireAdmin()` is the only thing standing
 * between a request and a write. It must run before anything else — every write
 * action in this app follows the same rule (blueprint §5).
 */
export async function createLocationAction(
  _prev: FormState,
  payload: unknown,
): Promise<FormState> {
  await requireAdmin();

  try {
    await createLocation(payload);
  } catch (err) {
    if (err instanceof ZodError) {
      return {error: err.issues.map((i) => i.message).join(' · ')};
    }
    console.error('createLocation failed:', err);
    return {error: 'Greška pri čuvanju. Pokušajte ponovo.'};
  }

  // redirect() throws NEXT_REDIRECT — must live outside the try/catch above.
  redirect('/admin');
}
