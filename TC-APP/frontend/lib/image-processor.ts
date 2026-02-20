import sharp from 'sharp';

const TARGET_QUALITY = 85;
const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'jpg'];
const ORIGINAL_RATIO_MAX_DIMENSION = 1200;

export type ImagePreset = 'standard' | 'high-res' | 'original-ratio';

export interface PresetConfig {
  label: string;
  description: string;
  width: number | null;
  height: number | null;
}

export const IMAGE_PRESETS: Record<ImagePreset, PresetConfig> = {
  'standard': {
    label: '標準 (800x1120)',
    description: '表面向き。5:7比率に白背景パディング',
    width: 800,
    height: 1120,
  },
  'high-res': {
    label: '高解像度 (1200x1680)',
    description: '裏面向き。細かい文字やシリアル番号も鮮明',
    width: 1200,
    height: 1680,
  },
  'original-ratio': {
    label: 'オリジナル比率維持',
    description: '見切れ防止。元の比率のままWebP最適化（最大1200px）',
    width: null,
    height: null,
  },
};

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

function processWithFixedDimensions(
  pipeline: sharp.Sharp,
  inputWidth: number,
  inputHeight: number,
  targetWidth: number,
  targetHeight: number
): sharp.Sharp {
  const targetAspect = targetWidth / targetHeight;
  const inputAspect = inputWidth / inputHeight;

  let resizeWidth: number;
  let resizeHeight: number;

  if (inputAspect > targetAspect) {
    resizeWidth = targetWidth;
    resizeHeight = Math.round(targetWidth / inputAspect);
  } else {
    resizeHeight = targetHeight;
    resizeWidth = Math.round(targetHeight * inputAspect);
  }

  pipeline = pipeline.resize(resizeWidth, resizeHeight, {
    fit: 'inside',
    withoutEnlargement: false,
  });

  pipeline = pipeline.extend({
    top: Math.round((targetHeight - resizeHeight) / 2),
    bottom: Math.ceil((targetHeight - resizeHeight) / 2),
    left: Math.round((targetWidth - resizeWidth) / 2),
    right: Math.ceil((targetWidth - resizeWidth) / 2),
    background: { r: 255, g: 255, b: 255 },
  });

  pipeline = pipeline.resize(targetWidth, targetHeight, {
    fit: 'cover',
  });

  return pipeline;
}

function processWithOriginalRatio(
  pipeline: sharp.Sharp,
  inputWidth: number,
  inputHeight: number
): sharp.Sharp {
  const maxDim = ORIGINAL_RATIO_MAX_DIMENSION;

  if (inputWidth <= maxDim && inputHeight <= maxDim) {
    return pipeline;
  }

  if (inputWidth > inputHeight) {
    pipeline = pipeline.resize(maxDim, null, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  } else {
    pipeline = pipeline.resize(null, maxDim, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  return pipeline;
}

export async function processCardImage(
  fileBuffer: Buffer,
  originalFilename: string,
  preset: ImagePreset = 'standard'
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

    const presetConfig = IMAGE_PRESETS[preset];

    if (preset === 'original-ratio') {
      pipeline = processWithOriginalRatio(pipeline, inputWidth, inputHeight);
    } else {
      const targetWidth = presetConfig.width!;
      const targetHeight = presetConfig.height!;
      pipeline = processWithFixedDimensions(pipeline, inputWidth, inputHeight, targetWidth, targetHeight);
    }

    const outputBuffer = await pipeline
      .webp({ quality: TARGET_QUALITY })
      .toBuffer();

    const outputMetadata = await sharp(outputBuffer).metadata();

    const fallbackWidth = presetConfig.width ?? inputWidth;
    const fallbackHeight = presetConfig.height ?? inputHeight;

    return {
      buffer: outputBuffer,
      metadata: {
        width: outputMetadata.width ?? fallbackWidth,
        height: outputMetadata.height ?? fallbackHeight,
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
