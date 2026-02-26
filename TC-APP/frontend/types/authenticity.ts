export interface CameraGuideState {
  brightness: 'too_dark' | 'ok' | 'too_bright';
  tilt: 'ok' | 'tilted';
  focus: 'ok' | 'blurry';
  cardDetected: boolean;
  readyToCapture: boolean;
}
