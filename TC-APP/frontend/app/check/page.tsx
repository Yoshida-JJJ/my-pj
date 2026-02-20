'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShootingTutorial from '@/components/AuthenticityCheck/ShootingTutorial';
import CameraCapture from '@/components/AuthenticityCheck/CameraCapture';
import ImageUploader from '@/components/AuthenticityCheck/ImageUploader';
import RiskScoreResult from '@/components/AuthenticityCheck/RiskScoreResult';
import { checkImageQuality } from '@/lib/imageQuality';
import { AuthenticityResult } from '@/types/authenticity';
import { Shield, Camera, Upload } from 'lucide-react';

type Step = 'select' | 'tutorial' | 'camera' | 'upload' | 'processing' | 'result';

export default function AuthenticityCheckPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [isMobile, setIsMobile] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [result, setResult] = useState<AuthenticityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('authenticity-tutorial-seen');
    setShowTutorial(!hasSeenTutorial);
  }, []);

  const handleTutorialComplete = () => {
    localStorage.setItem('authenticity-tutorial-seen', 'true');
    setStep('camera');
  };

  const handleTutorialSkip = () => {
    localStorage.setItem('authenticity-tutorial-seen', 'true');
    setStep('camera');
  };

  const handleCapture = async (imageData: string) => {
    await processImage(imageData);
  };

  const handleUpload = async (frontImage: string, backImage?: string) => {
    await processImage(frontImage, backImage);
  };

  const processImage = async (frontImage: string, backImage?: string) => {
    setStep('processing');
    setIsProcessing(true);
    setError(null);

    try {
      const blob = await fetch(frontImage).then(r => r.blob());
      const imageQuality = await checkImageQuality(blob);

      if (imageQuality.recommendation === 'retake') {
        setError('画像品質が低いため、正確な判定ができません。撮り直してください。');
        setStep('select');
        return;
      }

      const response = await fetch('/api/authenticity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontImage,
          backImage,
          imageQuality,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '判定に失敗しました');
      }

      const data = await response.json();
      setResult({
        ...data,
        imageQuality,
      });
      setStep('result');

    } catch (err: unknown) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : '処理中にエラーが発生しました');
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setStep('select');
  };

  const handleClose = () => {
    router.back();
  };

  if (step === 'tutorial' && showTutorial) {
    return (
      <ShootingTutorial
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
    );
  }

  if (step === 'camera') {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onCancel={() => setStep('select')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <Header />

      <main className="container mx-auto px-4 py-8 pt-32">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-blue/20 mb-4">
            <Shield className="w-8 h-8 text-brand-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            AI真贋チェック
          </h1>
          <p className="text-brand-platinum/70">
            カード画像をAIが分析し、リスクスコアを表示します
          </p>
        </div>

        {error && (
          <div className="max-w-lg mx-auto mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        {step === 'select' && (
          <div className="max-w-lg mx-auto">
            {isMobile ? (
              <div className="space-y-4">
                <button
                  onClick={() => showTutorial ? setStep('tutorial') : setStep('camera')}
                  className="w-full p-6 bg-brand-blue hover:bg-brand-blue-glow rounded-2xl flex items-center gap-4 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-bold text-lg">カメラで撮影</h3>
                    <p className="text-white/70 text-sm">
                      ガイド付きで最適な撮影ができます
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setStep('upload')}
                  className="w-full p-6 bg-brand-dark-light border border-white/10 hover:border-white/20 rounded-2xl flex items-center gap-4 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-brand-platinum" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-bold text-lg">画像をアップロード</h3>
                    <p className="text-brand-platinum/70 text-sm">
                      既存の画像ファイルを使用
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              <ImageUploader
                onUpload={handleUpload}
                isLoading={isProcessing}
              />
            )}
          </div>
        )}

        {step === 'upload' && (
          <ImageUploader
            onUpload={handleUpload}
            isLoading={isProcessing}
          />
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mb-6" />
            <p className="text-white text-lg font-medium">AIが画像を分析中...</p>
            <p className="text-brand-platinum/50 text-sm mt-2">
              通常10〜20秒かかります
            </p>
          </div>
        )}

        {step === 'result' && result && (
          <RiskScoreResult
            result={result}
            onRetry={handleRetry}
            onClose={handleClose}
          />
        )}

        {step === 'select' && (
          <div className="max-w-lg mx-auto mt-8 p-4 bg-brand-dark-light/50 rounded-xl border border-white/5">
            <h4 className="text-white text-sm font-medium mb-2">ご注意</h4>
            <ul className="text-brand-platinum/50 text-xs space-y-1">
              <li>• この機能はAIによる参考情報であり、確定的な真贋判定ではありません</li>
              <li>• 高精度の偽造品は検出できない場合があります</li>
              <li>• 高額カードは公式鑑定機関（PSA, BGS等）の利用を推奨します</li>
              <li>• 判定結果に関する責任は負いかねます</li>
            </ul>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
