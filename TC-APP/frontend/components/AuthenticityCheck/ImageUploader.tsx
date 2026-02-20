'use client';

import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageUploaderProps {
  onUpload: (frontImage: string, backImage?: string) => void;
  isLoading?: boolean;
}

export default function ImageUploader({ onUpload, isLoading }: ImageUploaderProps) {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'front' | 'back'>('front');

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      if (activeSlot === 'front') {
        setFrontImage(imageData);
        setActiveSlot('back');
      } else {
        setBackImage(imageData);
      }
    };
    reader.readAsDataURL(file);
  }, [activeSlot]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    processFile(files[0]);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    processFile(files[0]);
  }, [processFile]);

  const handleSubmit = () => {
    if (frontImage) {
      onUpload(frontImage, backImage || undefined);
    }
  };

  const removeImage = (slot: 'front' | 'back') => {
    if (slot === 'front') {
      setFrontImage(null);
      setActiveSlot('front');
    } else {
      setBackImage(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-brand-blue bg-brand-blue/10'
            : 'border-white/20 hover:border-white/40'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-brand-platinum/50 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">
            ドラッグ＆ドロップ または クリックして選択
          </p>
          <p className="text-brand-platinum/50 text-sm">
            対応形式: JPG, PNG, HEIC / 推奨: 1200×1600px以上
          </p>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div
          onClick={() => setActiveSlot('front')}
          className={`aspect-[63/88] rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
            activeSlot === 'front' && !frontImage
              ? 'border-brand-blue bg-brand-blue/10'
              : frontImage
              ? 'border-green-500'
              : 'border-white/20'
          }`}
        >
          {frontImage ? (
            <div className="relative w-full h-full">
              <img src={frontImage} alt="Front" className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); removeImage('front'); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                表面
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-brand-platinum/50">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="text-sm">表面（必須）</span>
            </div>
          )}
        </div>

        <div
          onClick={() => setActiveSlot('back')}
          className={`aspect-[63/88] rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
            activeSlot === 'back' && !backImage
              ? 'border-brand-blue bg-brand-blue/10'
              : backImage
              ? 'border-green-500'
              : 'border-white/20 border-dashed'
          }`}
        >
          {backImage ? (
            <div className="relative w-full h-full">
              <img src={backImage} alt="Back" className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); removeImage('back'); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                裏面
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-brand-platinum/50">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="text-sm">裏面（任意）</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-brand-dark-light/50 rounded-xl">
        <h4 className="text-white font-medium mb-2">撮影のコツ</h4>
        <ul className="text-brand-platinum/70 text-sm space-y-1">
          <li>・明るい場所で撮影</li>
          <li>・真上から水平に</li>
          <li>・無地の背景を使用</li>
          <li>・スリーブは外すと精度UP</li>
        </ul>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={!frontImage || isLoading}
        className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all ${
          frontImage && !isLoading
            ? 'bg-brand-blue hover:bg-brand-blue-glow text-white'
            : 'bg-white/10 text-white/50 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            判定中...
          </span>
        ) : (
          'AIチェックを実行'
        )}
      </motion.button>

      <div className="mt-6 p-4 border border-brand-blue/30 rounded-xl bg-brand-blue/5">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-brand-blue flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-medium">スマホで撮影する場合</p>
            <p className="text-brand-platinum/60 text-xs">
              このページをスマホで開くと、カメラガイド付きで撮影できます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
