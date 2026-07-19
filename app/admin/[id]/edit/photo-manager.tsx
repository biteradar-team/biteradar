'use client';
import {useActionState} from 'react';
import type {LocationPhoto} from '@/src/services/photos';
import {
  deletePhotoAction,
  type PhotoState,
  uploadPhotosAction,
} from './photo-actions';

export default function PhotoManager({
  locationId,
  photos,
}: {
  locationId: string;
  photos: LocationPhoto[];
}) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(
    uploadPhotosAction.bind(null, locationId),
    {},
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-black dark:text-zinc-100">
        Fotografije
      </h2>

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative overflow-hidden rounded border border-zinc-200 dark:border-zinc-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.altText ?? ''}
                className="h-32 w-full object-cover"
              />
              <form
                action={deletePhotoAction}
                onSubmit={(e) => {
                  if (!confirm('Obrisati fotografiju?')) e.preventDefault();
                }}
                className="absolute right-1 top-1"
              >
                <input type="hidden" name="photoId" value={p.id} />
                <input type="hidden" name="locationId" value={locationId} />
                <button
                  type="submit"
                  aria-label="Obriši fotografiju"
                  className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Još nema fotografija.</p>
      )}

      {/* key resets the file input once an upload adds photos (list grows). */}
      <form key={photos.length} action={formAction} className="flex flex-col gap-2">
        <input
          type="file"
          name="photos"
          accept="image/*"
          multiple
          className="text-sm text-zinc-700 file:mr-3 file:rounded file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-zinc-300 dark:file:border-zinc-700 dark:file:bg-zinc-900"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {pending ? 'Otpremanje…' : 'Otpremi fotografije'}
          </button>
          <span className="text-xs text-zinc-500">
            JPG/PNG/WebP, do 5 odjednom. EXIF/GPS se uklanja.
          </span>
        </div>
        {state.error && (
          <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}
      </form>
    </section>
  );
}
