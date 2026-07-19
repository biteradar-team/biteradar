'use server';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/src/lib/auth';
import {addLocationPhotos, deletePhoto} from '@/src/services/photos';

export type PhotoState = {error?: string};

/**
 * Photo actions for the edit page. Binary FormData (not the JSON create/update
 * action). GATE FIRST: Storage writes use the service_role client, which
 * bypasses everything — `requireAdmin()` is the only thing guarding them.
 */

export async function uploadPhotosAction(
  locationId: string,
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  await requireAdmin();

  const files = formData.getAll('photos').filter((v): v is File => v instanceof File);
  const {added, errors} = await addLocationPhotos(locationId, files);

  revalidatePath(`/admin/${locationId}/edit`);
  if (errors.length) {
    return {error: `${added ? `Dodato: ${added}. ` : ''}${errors.join(' · ')}`};
  }
  return {};
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const photoId = String(formData.get('photoId') ?? '');
  const locationId = String(formData.get('locationId') ?? '');
  if (photoId) await deletePhoto(photoId);
  if (locationId) revalidatePath(`/admin/${locationId}/edit`);
}
