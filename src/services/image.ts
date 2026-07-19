import sharp from 'sharp';

/**
 * Re-encode an uploaded image to a metadata-stripped, size-capped WebP
 * (blueprint §323). Re-encoding drops EXIF/GPS (sharp doesn't carry metadata
 * unless asked); `.rotate()` first bakes orientation so the pixels stay upright.
 * Throws on input that isn't a real image — sharp validates magic bytes.
 *
 * Pure (no db/Storage), so it lives outside the `server-only` photo service and
 * unit tests can exercise it. sharp is a native node module — fine under vitest.
 */
export async function processImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true})
    .webp({quality: 80})
    .toBuffer();
}
