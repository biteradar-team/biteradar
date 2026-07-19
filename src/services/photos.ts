import 'server-only';
import crypto from 'node:crypto';
import {eq} from 'drizzle-orm';
import {db} from '@/src/db';
import {photos} from '@/src/db/schema';
import {createAdminClient} from '@/src/lib/supabase/admin';
import {processImage} from './image';

/**
 * Location photo storage (blueprint §14/§323). Founders shoot photos on-site;
 * this processes and stores them so a location becomes a complete record.
 *
 * Processing is server-side and mandatory (§323): re-encode to WebP (strips
 * EXIF/GPS), reject non-images (sharp throws on bad magic bytes), cap size.
 * ONE stored image per photo — size variants come from Storage transforms on
 * read (ADR 0001), so nothing is pre-generated here.
 *
 * SECURITY: the file upload uses the service_role Storage client (bypasses RLS);
 * the DB row uses the owner `db` (also bypasses RLS). The ONLY gate is
 * `requireAdmin()` in the calling action — this module must never run
 * unauthenticated. Public bucket + random keys is the intended model (§204).
 */

const BUCKET = 'photos';
const MAX_PER_UPLOAD = 5;
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB pre-processing

export type LocationPhoto = {id: string; url: string; altText: string | null};

/** Public URL for a stored object key (bucket is public — blueprint §204). */
export function photoPublicUrl(objectKey: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${BUCKET}/${objectKey}`;
}

export async function addLocationPhotos(
  locationId: string,
  files: File[],
): Promise<{added: number; errors: string[]}> {
  const errors: string[] = [];
  const valid = files.filter((f) => f && f.size > 0);
  if (valid.length === 0) return {added: 0, errors: ['Nijedna datoteka nije izabrana.']};
  if (valid.length > MAX_PER_UPLOAD) {
    return {added: 0, errors: [`Najviše ${MAX_PER_UPLOAD} fotografija odjednom.`]};
  }

  const admin = createAdminClient();
  // Append after any existing photos.
  const existing = await db
    .select({id: photos.id})
    .from(photos)
    .where(eq(photos.locationId, locationId));
  let sortOrder = existing.length;
  let added = 0;

  for (const file of valid) {
    try {
      if (file.size > MAX_BYTES) {
        throw new Error(`„${file.name}“ je prevelika (maks. 15 MB).`);
      }
      const input = Buffer.from(await file.arrayBuffer());

      // Strips EXIF/GPS + converts to WebP; throws on non-images (§323).
      let webp: Buffer;
      try {
        webp = await processImage(input);
      } catch {
        throw new Error(`„${file.name}“ nije važeća slika.`);
      }

      const key = `locations/${locationId}/${crypto.randomUUID()}.webp`;
      const {error} = await admin.storage
        .from(BUCKET)
        .upload(key, webp, {contentType: 'image/webp'});
      if (error) throw new Error(`Otpremanje nije uspelo: ${error.message}`);

      // ponytail: upload-then-insert — if this insert fails the object orphans
      // in the bucket (rare). Acceptable pre-launch; GC job deferred.
      await db.insert(photos).values({locationId, objectKey: key, sortOrder: sortOrder++});
      added++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return {added, errors};
}

export async function deletePhoto(photoId: string): Promise<void> {
  const [row] = await db
    .select({key: photos.objectKey})
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);
  if (!row) return;

  await createAdminClient().storage.from(BUCKET).remove([row.key]);
  await db.delete(photos).where(eq(photos.id, photoId));
}

export async function listLocationPhotos(
  locationId: string,
): Promise<LocationPhoto[]> {
  const rows = await db
    .select({id: photos.id, objectKey: photos.objectKey, altText: photos.altText})
    .from(photos)
    .where(eq(photos.locationId, locationId))
    .orderBy(photos.sortOrder);

  return rows.map((r) => ({
    id: r.id,
    altText: r.altText,
    url: photoPublicUrl(r.objectKey),
  }));
}
