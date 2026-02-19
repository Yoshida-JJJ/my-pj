import sharp from 'sharp';

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 1120;
const TARGET_QUALITY = 85;
const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'jpg'];

export interface ProcessedImageResult {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

function validateFileFormat(filename: string): void {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_FORMATS.includes(ext)) {
    throw new ImageProcessingError(
      'ファイル形式が無効です。JPEG、PNG、WebPのみ対応しています。'
    );
  }
}

function validateFileSize(buffer: Buffer): void {
  if (buffer.length > MAX_INPUT_SIZE) {
    throw new ImageProcessingError(
      'ファイルサイズが大きすぎます。最大10MBまでです。'
    );
  }
}

export async function processCardImage(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<ProcessedImageResult> {
  validateFileFormat(originalFilename);
  validateFileSize(fileBuffer);

  try {
    const image = sharp(fileBuffer);
    const inputMetadata = await image.metadata();

    if (
      !inputMetadata.width ||
      !inputMetadata.height ||
      !inputMetadata.format
    ) {
      throw new ImageProcessingError('画像処理に失敗しました。');
    }

    const inputFormat = inputMetadata.format;
    if (!ALLOWED_FORMATS.includes(inputFormat)) {
      throw new ImageProcessingError(
        'ファイル形式が無効です。JPEG、PNG、WebPのみ対応しています。'
      );
    }

    let pipeline = sharp(fileBuffer)
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .removeAlpha();

    const inputWidth = inputMetadata.width;
    const inputHeight = inputMetadata.height;

    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
    const inputAspect = inputWidth / inputHeight;

    let resizeWidth: number;
    let resizeHeight: number;

    if (inputAspect > targetAspect) {
      resizeWidth = TARGET_WIDTH;
      resizeHeight = Math.round(TARGET_WIDTH / inputAspect);
    } else {
      resizeHeight = TARGET_HEIGHT;
      resizeWidth = Math.round(TARGET_HEIGHT * inputAspect);
    }

    pipeline = pipeline.resize(resizeWidth, resizeHeight, {
      fit: 'inside',
      withoutEnlargement: false,
    });

    pipeline = pipeline.extend({
      top: Math.round((TARGET_HEIGHT - resizeHeight) / 2),
      bottom: Math.ceil((TARGET_HEIGHT - resizeHeight) / 2),
      left: Math.round((TARGET_WIDTH - resizeWidth) / 2),
      right: Math.ceil((TARGET_WIDTH - resizeWidth) / 2),
      background: { r: 255, g: 255, b: 255 },
    });

    pipeline = pipeline.resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'cover',
    });

    const outputBuffer = await pipeline
      .webp({ quality: TARGET_QUALITY })
      .toBuffer();

    const outputMetadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      metadata: {
        width: outputMetadata.width ?? TARGET_WIDTH,
        height: outputMetadata.height ?? TARGET_HEIGHT,
        format: 'webp',
        size: outputBuffer.length,
      },
    };
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      throw error;
    }
    throw new ImageProcessingError('画像処理に失敗しました。');
  }
}
