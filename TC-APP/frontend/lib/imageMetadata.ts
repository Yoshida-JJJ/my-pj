import exif from 'exifr';
import { MetadataCheckResult } from '@/types/authenticity';

export async function checkImageMetadata(file: File): Promise<MetadataCheckResult> {
  const warnings: string[] = [];

  try {
    const metadata = await exif.parse(file, {
      pick: ['Make', 'Model', 'DateTimeOriginal', 'Software',
             'ImageWidth', 'ImageHeight', 'GPSLatitude', 'GPSLongitude',
             'ColorSpace', 'ExifImageWidth', 'ExifImageHeight']
    });

    if (!metadata) {
      warnings.push('画像にメタデータが含まれていません');
      return {
        hasExif: false, hasDeviceInfo: false,
        hasCaptureDate: false, hasGPS: false,
        imageSource: 'unknown', warnings
      };
    }

    const hasDeviceInfo = !!(metadata.Make && metadata.Model);
    const hasCaptureDate = !!metadata.DateTimeOriginal;
    const hasGPS = !!(metadata.GPSLatitude && metadata.GPSLongitude);

    const isScreenshot = detectScreenshot(metadata, file);

    if (!hasDeviceInfo) {
      warnings.push('撮影デバイス情報が確認できません');
    }
    if (isScreenshot) {
      warnings.push('スクリーンショットの可能性があります');
    }

    return {
      hasExif: true,
      hasDeviceInfo,
      hasCaptureDate,
      hasGPS,
      deviceMake: metadata.Make || undefined,
      deviceModel: metadata.Model || undefined,
      captureDate: metadata.DateTimeOriginal
        ? new Date(metadata.DateTimeOriginal).toISOString()
        : undefined,
      imageSource: isScreenshot ? 'screenshot' : (hasDeviceInfo ? 'camera' : 'unknown'),
      warnings
    };
  } catch {
    warnings.push('メタデータの読み取りに失敗しました');
    return {
      hasExif: false, hasDeviceInfo: false,
      hasCaptureDate: false, hasGPS: false,
      imageSource: 'unknown', warnings
    };
  }
}

interface ExifMetadata {
  Make?: string;
  Model?: string;
  Software?: string;
  ExifImageWidth?: number;
  ImageWidth?: number;
  ExifImageHeight?: number;
  ImageHeight?: number;
}

function detectScreenshot(metadata: ExifMetadata, file: File): boolean {
  const screenshotSoftware = [
    'screenshot', 'snipping', 'capture', 'grab',
    'sharex', 'greenshot', 'lightshot',
    'paint', 'photoshop', 'gimp', 'canva',
    'midjourney', 'dall-e', 'stable diffusion'
  ];

  const software = (metadata.Software || '').toLowerCase();
  if (screenshotSoftware.some(s => software.includes(s))) {
    return true;
  }

  const commonScreenResolutions = [
    [1920, 1080], [2560, 1440], [3840, 2160],
    [1170, 2532], [1284, 2778], [1290, 2796],
    [1080, 2400], [1440, 3200],
  ];

  if (!metadata.Make && !metadata.Model) {
    const w = metadata.ExifImageWidth || metadata.ImageWidth;
    const h = metadata.ExifImageHeight || metadata.ImageHeight;

    if (w && h) {
      const isScreenRes = commonScreenResolutions.some(
        ([sw, sh]) => (w === sw && h === sh) || (w === sh && h === sw)
      );
      if (isScreenRes) return true;
    }
  }

  if (file.type === 'image/png' && !metadata.Make) {
    return true;
  }

  return false;
}

export function applyMetadataModifier(
  aiTrustScore: number,
  metadataCheck: MetadataCheckResult
): { finalScore: number; scoreNote: string | null } {

  if (metadataCheck.imageSource === 'screenshot') {
    return {
      finalScore: Math.min(aiTrustScore, 30),
      scoreNote: 'スクリーンショットが検出されたため、スコアの信頼性が低下しています'
    };
  }

  if (metadataCheck.imageSource === 'unknown') {
    return {
      finalScore: Math.max(0, aiTrustScore - 15),
      scoreNote: '画像の撮影情報が確認できないため、スコアが補正されています'
    };
  }

  return { finalScore: aiTrustScore, scoreNote: null };
}
