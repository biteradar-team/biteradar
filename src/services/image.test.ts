import sharp from 'sharp';
import {describe, expect, it} from 'vitest';
import {processImage} from './image';

// A red JPEG carrying EXIF, wider than the 1600px cap.
async function exifJpeg() {
  return sharp({
    create: {width: 2000, height: 100, channels: 3, background: {r: 255, g: 0, b: 0}},
  })
    .withExif({IFD0: {Copyright: 'BiteRadar test'}})
    .jpeg()
    .toBuffer();
}

describe('processImage', () => {
  it('re-encodes to WebP, caps size, and strips EXIF', async () => {
    const input = await exifJpeg();
    expect((await sharp(input).metadata()).exif).toBeDefined(); // input HAS exif

    const out = await processImage(input);
    const meta = await sharp(out).metadata();

    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1600); // scaled down from 2000
    expect(meta.exif).toBeUndefined(); // metadata gone
  });

  it('rejects input that is not an image', async () => {
    await expect(processImage(Buffer.from('definitely not an image'))).rejects.toThrow();
  });
});
