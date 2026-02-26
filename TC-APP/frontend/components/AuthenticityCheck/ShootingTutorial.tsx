'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Ruler, Target, Camera, ChevronRight } from 'lucide-react';

interface ShootingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: <Lightbulb className="w-16 h-16 text-brand-gold" />,
    title: '明るい場所で',
    description: '窓際や照明の下で撮影すると、AIの判定精度が上がります',
  },
  {
    icon: <Ruler className="w-16 h-16 text-brand-blue" />,
    title: '真上から水平に',
    description: 'カードに対して真上から、傾かないように撮影してください',
  },
  {
    icon: <Target className="w-16 h-16 text-green-400" />,
    title: 'ガイド枠に合わせて',
    description:
      '画面のガイド枠にカードを合わせると、自動で撮影ポイントを検出します',
  },
];

/**
 * ShootingTutorial - 初回撮影時のチュートリアルモーダル
 *
 * - フルスクリーンモーダルとして表示
 * - 3ステップのスライド形式チュートリアル
 * - framer-motionによるスライドアニメーション
 */
export default function ShootingTutorial({
  onComplete,
  onSkip,
}: ShootingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // スライドアニメーションのバリアント
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-dark">
      {/* ヘッダー: スキップボタン */}
      <div className="flex justify-end p-4">
        <button
          onClick={onSkip}
          className="text-brand-platinum/50 hover:text-brand-platinum/80 text-sm transition-colors flex items-center gap-1"
        >
          スキップ
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-col items-center text-center"
          >
            {/* アイコン */}
            <div className="mb-8">{step.icon}</div>

            {/* タイトル */}
            <h2 className="text-2xl font-bold text-white mb-4">{step.title}</h2>

            {/* 説明 */}
            <p className="text-brand-platinum/60 text-base leading-relaxed max-w-sm">
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* フッター: ボタン + ステップインジケーター */}
      <div className="flex flex-col items-center gap-6 p-8 pb-12">
        {/* アクションボタン */}
        <button
          onClick={handleNext}
          className="bg-brand-blue hover:bg-brand-blue-glow text-white rounded-xl px-8 py-3 font-medium transition-colors flex items-center gap-2 min-w-[200px] justify-center"
        >
          {isLastStep ? (
            <>
              <Camera className="w-5 h-5" />
              撮影を始める
            </>
          ) : (
            <>
              次へ
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* ステップインジケーター（ドット） */}
        <div className="flex items-center gap-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                index === currentStep
                  ? 'bg-brand-blue'
                  : 'bg-brand-platinum/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
