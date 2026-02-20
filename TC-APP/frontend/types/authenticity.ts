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
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: 'high' | 'medium' | 'low';
  factors: RiskFactor[];
  positiveSignals: string[];
  limitations: string[];
  imageQuality: ImageQualityResult;
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
}

export interface CameraGuideState {
  brightness: 'too_dark' | 'ok' | 'too_bright';
  tilt: 'ok' | 'tilted';
  focus: 'ok' | 'blurry';
  cardDetected: boolean;
  readyToCapture: boolean;
}
