export interface ImageQualityResult {
  isAcceptable: boolean;
  score: number;
  checks: {
    resolution: QualityCheck;
    brightness: QualityCheck;
    focus: QualityCheck;
    cardDetection: QualityCheck;
  };
  recommendation: 'good' | 'acceptable' | 'retake';
}

export interface QualityCheck {
  passed: boolean;
  value: number;
  threshold: number;
  message: string;
}

export interface AuthenticityResult {
  trustScore: number;
  trustLevel: 'high' | 'medium' | 'low';
  factors?: AuthenticityFactor[];
  positiveSignals?: string[];
  overallComment?: string;
  imageQuality?: ImageQualityResult;
  metadataCheck?: MetadataCheckResult;
  scoreNote?: string | null;
}

export interface AuthenticityFactor {
  category: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
}

export interface MetadataCheckResult {
  hasExif: boolean;
  hasDeviceInfo: boolean;
  hasCaptureDate: boolean;
  hasGPS: boolean;
  deviceMake?: string;
  deviceModel?: string;
  captureDate?: string;
  imageSource: 'camera' | 'screenshot' | 'unknown';
  warnings: string[];
}

export interface CameraGuideState {
  brightness: 'too_dark' | 'ok' | 'too_bright';
  tilt: 'ok' | 'tilted';
  focus: 'ok' | 'blurry';
  cardDetected: boolean;
  readyToCapture: boolean;
}
