'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import CameraGuideOverlay from './CameraGuideOverlay';
import { CameraGuideState } from '@/types/authenticity';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  cardType?: 'standard' | 'small';
}

export default function CameraCapture({ onCapture, onCancel, cardType = 'standard' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guideState, setGuideState] = useState<CameraGuideState>({
    brightness: 'ok',
    tilt: 'ok',
    focus: 'ok',
    cardDetected: false,
    readyToCapture: false,
  });
  const [feedbackMessage, setFeedbackMessage] = useState('ガイド枠にカードを合わせてください');

  const detectCardSimple = useCallback((imageData: ImageData): boolean => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const sampleSize = 100;

    let edgeCount = 0;
    for (let y = centerY - sampleSize; y < centerY + sampleSize; y += 5) {
      for (let x = centerX - sampleSize; x < centerX + sampleSize; x += 5) {
        const idx = (y * width + x) * 4;
        const nextIdx = (y * width + x + 1) * 4;
        const diff = Math.abs(data[idx] - data[nextIdx]) +
                     Math.abs(data[idx + 1] - data[nextIdx + 1]) +
                     Math.abs(data[idx + 2] - data[nextIdx + 2]);
        if (diff > 50) edgeCount++;
      }
    }

    return edgeCount > 50;
  }, []);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    async function startCamera() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('カメラを起動できませんでした。カメラへのアクセスを許可してください。');
      }
    }
    startCamera();

    return () => {
      mediaStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    const checkInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState !== 4) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let totalBrightness = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        totalBrightness += 0.299 * imageData.data[i] +
                          0.587 * imageData.data[i + 1] +
                          0.114 * imageData.data[i + 2];
      }
      const avgBrightness = totalBrightness / (imageData.data.length / 4);

      let brightness: 'too_dark' | 'ok' | 'too_bright' = 'ok';
      if (avgBrightness < 60) brightness = 'too_dark';
      else if (avgBrightness > 240) brightness = 'too_bright';

      const cardDetected = detectCardSimple(imageData);

      const newState: CameraGuideState = {
        brightness,
        tilt: 'ok',
        focus: 'ok',
        cardDetected,
        readyToCapture: brightness === 'ok' && cardDetected,
      };

      setGuideState(newState);

      if (brightness === 'too_dark') {
        setFeedbackMessage('もう少し明るい場所で撮影してください');
      } else if (brightness === 'too_bright') {
        setFeedbackMessage('直射日光を避けてください');
      } else if (!cardDetected) {
        setFeedbackMessage('ガイド枠にカードを合わせてください');
      } else {
        setFeedbackMessage('撮影できます');
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [stream, detectCardSimple]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(imageData);
  }, [onCapture]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-brand-dark flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-brand-dark-light text-white rounded-xl"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      <CameraGuideOverlay guideState={guideState} cardType={cardType} />

      <div className="absolute top-12 left-0 right-0 p-4 flex justify-center">
        <div className={`text-center py-2 px-4 rounded-full ${
          guideState.readyToCapture
            ? 'bg-green-500/80 text-white'
            : 'bg-black/60 text-white'
        }`}>
          {feedbackMessage}
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8">
        <button
          onClick={onCancel}
          className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
        >
          <RefreshCw className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={handleCapture}
          disabled={!guideState.readyToCapture}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
            guideState.readyToCapture
              ? 'border-white bg-white/20 active:scale-95'
              : 'border-white/50 bg-white/10 opacity-50'
          }`}
        >
          <div className={`w-14 h-14 rounded-full ${
            guideState.readyToCapture ? 'bg-white' : 'bg-white/50'
          }`} />
        </button>

        <div className="w-14 h-14" />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
