'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Square, Smartphone, Hand, ChevronRight, X } from 'lucide-react';

interface ShootingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_SLIDES = [
  {
    icon: Sun,
    title: '明るい場所で',
    description: '窓際や照明の下で撮影してください。\n影や逆光を避けましょう。',
    tip: '自然光がベストです',
  },
  {
    icon: Square,
    title: '無地の背景に',
    description: 'カードがはっきり見える背景を選びましょう。\n白・黒・グレーがおすすめです。',
    tip: 'テーブルや紙の上が最適',
  },
  {
    icon: Smartphone,
    title: '真上から水平に',
    description: 'カードに対して垂直に撮影してください。\n斜めからの撮影は避けましょう。',
    tip: 'スマホを平行に保つ',
  },
  {
    icon: Hand,
    title: 'ブレないように',
    description: '両手でスマホを固定し、\nシャッターを押す時も動かさないように。',
    tip: '肘を体につけると安定します',
  },
];

export default function ShootingTutorial({ onComplete, onSkip }: ShootingTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < TUTORIAL_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const slide = TUTORIAL_SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-brand-dark-light rounded-2xl p-6 max-w-sm w-full border border-white/10 relative"
      >
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-brand-platinum/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center gap-2 mb-6">
          {TUTORIAL_SLIDES.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentSlide ? 'bg-brand-blue' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-brand-blue/20 flex items-center justify-center mx-auto mb-4">
              <Icon className="w-10 h-10 text-brand-blue" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{slide.title}</h3>
            <p className="text-brand-platinum/70 whitespace-pre-line mb-4">
              {slide.description}
            </p>
            <div className="bg-brand-gold/10 text-brand-gold text-sm py-2 px-4 rounded-lg inline-block">
              {slide.tip}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 text-brand-platinum/70 hover:text-white transition-colors"
          >
            スキップ
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-brand-blue hover:bg-brand-blue-glow text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {currentSlide < TUTORIAL_SLIDES.length - 1 ? (
              <>
                次へ <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              '撮影を始める'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
