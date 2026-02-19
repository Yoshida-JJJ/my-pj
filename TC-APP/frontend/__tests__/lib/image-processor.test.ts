import { processCardImage, ImageProcessingError } from '../../lib/image-processor';
import sharp from 'sharp';

async function createTestImage(
  width: number,
  height: number,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  options?: { alpha?: boolean }
): Promise<Buffer> {
  let image = sharp({
    create: {
      width,
      height,
      channels: options?.alpha ? 4 : 3,
      background: options?.alpha
        ? { r: 255, g: 0, b: 0, alpha: 0.5 }
        : { r: 255, g: 0, b: 0 },
    },
  });

  if (format === 'jpeg') {
    image = image.jpeg({ quality: 90 });
  } else if (format === 'png') {
    image = image.png();
  } else {
    image = image.webp({ quality: 90 });
  }

  return image.toBuffer();
}

describe('processCardImage', () => {
  it('should convert JPEG to WebP with correct dimensions', async () => {
    const input = await createTestImage(1600, 2240, 'jpeg');
    const result = await processCardImage(input, 'test.jpg');

    expect(result.metadata.format).toBe('webp');
    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(1120);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('should convert PNG to WebP and flatten transparency', async () => {
    const input = await createTestImage(800, 1120, 'png', { alpha: true });
    const result = await processCardImage(input, 'test.png');

    expect(result.metadata.format).toBe('webp');
    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(1120);

    const outputMeta = await sharp(result.buffer).metadata();
    expect(outputMeta.channels).toBe(3);
  });

  it('should resize oversized images while maintaining aspect ratio', async () => {
    const input = await createTestImage(4000, 5600, 'jpeg');
    const result = await processCardImage(input, 'large.jpg');

    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(1120);
    expect(result.metadata.size).toBeLessThan(input.length);
  });

  it('should handle wide images with padding', async () => {
    const input = await createTestImage(2000, 1000, 'jpeg');
    const result = await processCardImage(input, 'wide.jpg');

    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(1120);
  });

  it('should handle tall images with padding', async () => {
    const input = await createTestImage(500, 3000, 'jpeg');
    const result = await processCardImage(input, 'tall.jpg');

    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(1120);
  });

  it('should throw error for invalid file format', async () => {
    const input = Buffer.from('fake gif data');

    await expect(processCardImage(input, 'test.gif')).rejects.toThrow(
      ImageProcessingError
    );
    await expect(processCardImage(input, 'test.gif')).rejects.toThrow(
      'ファイル形式が無効です。JPEG、PNG、WebPのみ対応しています。'
    );
  });

  it('should throw error for file too large', async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

    await expect(processCardImage(largeBuffer, 'huge.jpg')).rejects.toThrow(
      ImageProcessingError
    );
    await expect(processCardImage(largeBuffer, 'huge.jpg')).rejects.toThrow(
      'ファイルサイズが大きすぎます。最大10MBまでです。'
    );
  });

  it('should convert WebP input to optimized WebP', async () => {
    const input = await createTestImage(1600, 2240, 'webp');
    const result = await processCardImage(input, 'test.webp');

    expect(result.metadata.format).toBe('webp');
    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(1120);
  });
});
