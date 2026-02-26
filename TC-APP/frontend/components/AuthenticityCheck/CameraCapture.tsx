'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import { CameraGuideState } from '@/types/authenticity';
import CameraGuideOverlay from './CameraGuideOverlay';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  cardType?: 'standard' | 'small';
}

/**
 * CameraCapture - スマホカメラ撮影UIコンポーネント
 *
 * - フルスクリーンモーダルとして表示
 * - スマホの背面カメラを起動
 * - リアルタイム品質チェック（明るさ判定）
 * - CameraGuideOverlayをカメラプレビュー上に重ねて表示
 * - 撮影ボタンでBase64画像をキャプチャ
 */
export default function CameraCapture({
  onCapture,
  onCancel,
  cardType = 'standard',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qualityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [guideState, setGuideState] = useState<CameraGuideState>({
    brightness: 'ok',
    tilt: 'ok',
    focus: 'ok',
    cardDetected: false,
    readyToCapture: false,
  });

  // 明るさチェック関数
  const checkBrightness = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 小さいサイズでサンプリング（パフォーマンス向上）
    const sampleWidth = 160;
    const sampleHeight = 120;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    // 平均輝度を計算
    let totalBrightness = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      // 輝度 = 0.299*R + 0.587*G + 0.114*B
      totalBrightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    const avgBrightness = totalBrightness / pixelCount;

    // 明るさ判定
    let brightness: CameraGuideState['brightness'];
    if (avgBrightness < 80) {
      brightness = 'too_dark';
    } else if (avgBrightness > 200) {
      brightness = 'too_bright';
    } else {
      brightness = 'ok';
    }

    setGuideState((prev) => ({
      ...prev,
      brightness,
      readyToCapture: brightness === 'ok' && prev.tilt === 'ok' && prev.focus === 'ok',
    }));
  }, []);

  // カメラ起動
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (mounted) {
              setIsCameraReady(true);
            }
          };
        }
      } catch (error) {
        if (!mounted) return;

        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            setCameraError('カメラへのアクセスが拒否されました。ブラウザの設定からカメラへのアクセスを許可してください。');
          } else if (error.name === 'NotFoundError') {
            setCameraError('カメラが見つかりません。カメラが接続されているか確認してください。');
          } else if (error.name === 'NotReadableError') {
            setCameraError('カメラが他のアプリケーションで使用されています。');
          } else {
            setCameraError('カメラの起動に失敗しました。');
          }
        } else {
          setCameraError('カメラの起動に失敗しました。');
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (qualityIntervalRef.current) {
        clearInterval(qualityIntervalRef.current);
        qualityIntervalRef.current = null;
      }
    };
  }, []);

  // リアルタイム品質チェック（500ms間隔）
  useEffect(() => {
    if (!isCameraReady) return;

    qualityIntervalRef.current = setInterval(checkBrightness, 500);

    return () => {
      if (qualityIntervalRef.current) {
        clearInterval(qualityIntervalRef.current);
        qualityIntervalRef.current = null;
      }
    };
  }, [isCameraReady, checkBrightness]);

  // 撮影処理
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 実際の映像サイズでキャプチャ
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    // カメラを停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    onCapture(imageData);
  };

  // キャンセル処理
  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    onCancel();
  };

  // 明るさステータスの表示テキスト
  const getBrightnessLabel = (): { text: string; color: string } => {
    switch (guideState.brightness) {
      case 'too_dark':
        return { text: '暗すぎます', color: 'text-yellow-400' };
      case 'too_bright':
        return { text: '明るすぎます', color: 'text-yellow-400' };
      case 'ok':
        return { text: 'OK', color: 'text-green-400' };
    }
  };

  const brightnessInfo = getBrightnessLabel();

  // エラー表示
  if (cameraError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark">
        <div className="flex flex-col items-center px-8 text-center">
          <AlertCircle className="w-16 h-16 text-brand-platinum/50 mb-6" />
          <h2 className="text-xl font-bold text-white mb-3">
            カメラを起動できません
          </h2>
          <p className="text-brand-platinum/60 mb-8 leading-relaxed">
            {cameraError}
          </p>
          <button
            onClick={handleCancel}
            className="border border-white/20 text-brand-platinum/70 hover:bg-white/5 rounded-xl px-8 py-3 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-dark">
      {/* ヘッダー: 閉じるボタン */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          onClick={handleCancel}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* カメラプレビュー */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* ガイドオーバーレイ */}
        {isCameraReady && (
          <CameraGuideOverlay guideState={guideState} cardType={cardType} />
        )}

        {/* カメラ読み込み中 */}
        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-dark">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-brand-platinum/60 text-sm">カメラを起動中...</p>
            </div>
          </div>
        )}
      </div>

      {/* フッター: 明るさ表示 + 撮影ボタン */}
      <div className="relative z-10 flex flex-col items-center gap-4 p-6 bg-brand-dark/80 backdrop-blur-sm">
        {/* 明るさステータス */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-brand-platinum/50">明るさ:</span>
          <span className={`font-medium ${brightnessInfo.color}`}>
            {brightnessInfo.text}
          </span>
        </div>

        {/* 撮影ボタン */}
        <button
          onClick={handleCapture}
          disabled={!isCameraReady}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="撮影"
        >
          <Camera className="w-7 h-7 text-brand-dark" />
        </button>
      </div>

      {/* 非表示Canvas（品質チェック・キャプチャ用） */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
