import { ImageQualityResult, QualityCheck } from '@/types/authenticity';

const THRESHOLDS = {
  MIN_WIDTH: 1200,
  MIN_HEIGHT: 1600,
  MIN_BRIGHTNESS: 80,
  MAX_BRIGHTNESS: 220,
  MIN_FOCUS_SCORE: 100,
};

export async function checkImageQuality(
  imageFile: File | Blob
): Promise<ImageQualityResult> {
  const img = await loadImage(imageFile);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const resolution = checkResolution(img.width, img.height);
  const brightness = checkBrightness(imageData);
  const focus = checkFocus(imageData);
  const cardDetection = detectCard(imageData);

  const checks = { resolution, brightness, focus, cardDetection };
  const passedCount = Object.values(checks).filter(c => c.passed).length;
  const score = Math.round((passedCount / 4) * 100);

  let recommendation: 'good' | 'acceptable' | 'retake';
  if (passedCount === 4) {
    recommendation = 'good';
  } else if (passedCount >= 2) {
    recommendation = 'acceptable';
  } else {
    recommendation = 'retake';
  }

  return {
    isAcceptable: passedCount >= 2,
    score,
    checks,
    recommendation,
  };
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function checkResolution(width: number, height: number): QualityCheck {
  const passed = width >= THRESHOLDS.MIN_WIDTH && height >= THRESHOLDS.MIN_HEIGHT;
  return {
    passed,
    value: Math.min(width, height),
    threshold: THRESHOLDS.MIN_WIDTH,
    message: passed
      ? '解像度は十分です'
      : `解像度が低いです（${width}×${height}px）。1200×1600px以上を推奨します`,
  };
}

function checkBrightness(imageData: ImageData): QualityCheck {
  const data = imageData.data;
  let totalBrightness = 0;

  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const avgBrightness = totalBrightness / (data.length / 4);
  const passed = avgBrightness >= THRESHOLDS.MIN_BRIGHTNESS &&
                 avgBrightness <= THRESHOLDS.MAX_BRIGHTNESS;

  let message: string;
  if (avgBrightness < THRESHOLDS.MIN_BRIGHTNESS) {
    message = '画像が暗すぎます。明るい場所で撮影してください';
  } else if (avgBrightness > THRESHOLDS.MAX_BRIGHTNESS) {
    message = '画像が明るすぎます。直射日光を避けてください';
  } else {
    message = '明るさは適切です';
  }

  return {
    passed,
    value: Math.round(avgBrightness),
    threshold: THRESHOLDS.MIN_BRIGHTNESS,
    message,
  };
}

function checkFocus(imageData: ImageData): QualityCheck {
  const width = imageData.width;
  const height = imageData.height;
  const gray = toGrayscale(imageData);

  const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];

  let variance = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          sum += gray[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      variance += sum * sum;
      count++;
    }
  }

  const focusScore = variance / count;
  const passed = focusScore >= THRESHOLDS.MIN_FOCUS_SCORE;

  return {
    passed,
    value: Math.round(focusScore),
    threshold: THRESHOLDS.MIN_FOCUS_SCORE,
    message: passed
      ? 'ピントは合っています'
      : '画像がぼやけています。カメラを固定して撮影してください',
  };
}

function toGrayscale(imageData: ImageData): number[] {
  const gray: number[] = [];
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  return gray;
}

function detectCard(imageData: ImageData): QualityCheck {
  const width = imageData.width;
  const height = imageData.height;

  const marginX = Math.floor(width * 0.2);
  const marginY = Math.floor(height * 0.2);

  let edgeCount = 0;
  const gray = toGrayscale(imageData);

  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      const idx = y * width + x;
      const dx = Math.abs(gray[idx] - gray[idx + 1]);
      const dy = Math.abs(gray[idx] - gray[idx + width]);
      if (dx > 30 || dy > 30) edgeCount++;
    }
  }

  const totalPixels = (width - 2 * marginX) * (height - 2 * marginY);
  const edgeRatio = edgeCount / totalPixels;
  const detected = edgeRatio > 0.05 && edgeRatio < 0.5;

  return {
    passed: detected,
    value: Math.round(edgeRatio * 100),
    threshold: 5,
    message: detected
      ? 'カードを検出しました'
      : 'カードが検出できません。ガイド枠に合わせてください',
  };
}
