'use client';

import { useState, useCallback, useRef } from 'react';
import type { ImagePreset } from '../lib/image-processor';

const IMAGE_PRESET_OPTIONS: { value: ImagePreset; label: string; description: string }[] = [
  { value: 'standard', label: '標準 (800x1120)', description: '5:7比率・白背景パディング' },
  { value: 'high-res', label: '高解像度 (1200x1680)', description: '細かい文字も鮮明' },
  { value: 'original-ratio', label: 'オリジナル比率', description: '見切れ防止・元の比率維持' },
];

interface UploadedImage {
  url: string;
  originalSize: number;
  processedSize: number;
  dimensions: string;
}

interface CardImageUploaderProps {
  onUploadComplete: (images: { front?: UploadedImage; back?: UploadedImage }) => void;
}

const ERROR_MESSAGES = {
  invalidFormat: 'ファイル形式が無効です。JPEG、PNG、WebPのみ対応しています。',
  fileTooLarge: 'ファイルサイズが大きすぎます。最大10MBまでです。',
  uploadFailed: 'アップロードに失敗しました。もう一度お試しください。',
  processingFailed: '画像処理に失敗しました。',
} as const;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CardImageUploader({ onUploadComplete }: CardImageUploaderProps) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [frontPreset, setFrontPreset] = useState<ImagePreset>('standard');
  const [backPreset, setBackPreset] = useState<ImagePreset>('standard');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ front?: UploadedImage; back?: UploadedImage } | null>(null);
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [isDraggingBack, setIsDraggingBack] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return ERROR_MESSAGES.invalidFormat;
    }
    if (file.size > MAX_SIZE) {
      return ERROR_MESSAGES.fileTooLarge;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File, side: 'front' | 'back') => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setSuccessMessage(null);
      setUploadResult(null);

      const previewUrl = URL.createObjectURL(file);

      if (side === 'front') {
        if (frontPreview) URL.revokeObjectURL(frontPreview);
        setFrontFile(file);
        setFrontPreview(previewUrl);
      } else {
        if (backPreview) URL.revokeObjectURL(backPreview);
        setBackFile(file);
        setBackPreview(previewUrl);
      }
    },
    [validateFile, frontPreview, backPreview]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, side: 'front' | 'back') => {
      e.preventDefault();
      if (side === 'front') setIsDraggingFront(false);
      else setIsDraggingBack(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file, side);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((_e: React.DragEvent, side: 'front' | 'back') => {
    if (side === 'front') setIsDraggingFront(true);
    else setIsDraggingBack(true);
  }, []);

  const handleDragLeave = useCallback((_e: React.DragEvent, side: 'front' | 'back') => {
    if (side === 'front') setIsDraggingFront(false);
    else setIsDraggingBack(false);
  }, []);

  const handleUpload = async () => {
    if (!frontFile && !backFile) return;

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setProgress(10);

    try {
      const formData = new FormData();
      if (frontFile) {
        formData.append('front', frontFile);
        formData.append('frontPreset', frontPreset);
      }
      if (backFile) {
        formData.append('back', backFile);
        formData.append('backPreset', backPreset);
      }

      setProgress(30);

      const response = await fetch('/api/upload-card-image', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || ERROR_MESSAGES.uploadFailed);
      }

      setProgress(100);
      setUploadResult(data.images);
      setSuccessMessage('画像のアップロードと最適化が完了しました！');
      onUploadComplete(data.images);
    } catch (err) {
      const message = err instanceof Error ? err.message : ERROR_MESSAGES.uploadFailed;
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const renderPresetSelector = (
    side: 'front' | 'back',
    currentPreset: ImagePreset,
    setPreset: (preset: ImagePreset) => void
  ) => (
    <div className="mt-3 space-y-1.5">
      {IMAGE_PRESET_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
            currentPreset === option.value
              ? 'bg-brand-gold/10 border border-brand-gold/30'
              : 'bg-transparent border border-transparent hover:bg-white/5'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="radio"
            name={`preset-${side}`}
            value={option.value}
            checked={currentPreset === option.value}
            onChange={() => setPreset(option.value)}
            className="sr-only"
          />
          <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            currentPreset === option.value
              ? 'border-brand-gold'
              : 'border-brand-platinum/30'
          }`}>
            {currentPreset === option.value && (
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
            )}
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-medium ${
              currentPreset === option.value ? 'text-brand-gold' : 'text-brand-platinum/70'
            }`}>{option.label}</p>
            <p className="text-[10px] text-brand-platinum/40 truncate">{option.description}</p>
          </div>
        </label>
      ))}
    </div>
  );

  const renderDropZone = (
    side: 'front' | 'back',
    label: string,
    file: File | null,
    preview: string | null,
    isDragging: boolean,
    inputRef: React.RefObject<HTMLInputElement | null>,
    currentPreset: ImagePreset,
    setPreset: (preset: ImagePreset) => void
  ) => (
    <div className="flex-1">
      <label className="text-sm font-medium text-brand-platinum mb-2 block">{label}</label>
      <div
        onDrop={(e) => handleDrop(e, side)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, side)}
        onDragLeave={(e) => handleDragLeave(e, side)}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
          isDragging
            ? 'border-brand-gold bg-brand-gold/10 scale-[1.02]'
            : 'border-brand-platinum/20 hover:border-brand-gold/50 hover:bg-brand-gold/5'
        }`}
      >
        {preview ? (
          <div className="w-full h-full relative p-3 flex items-center justify-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={label}
              className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <p className="text-white font-bold text-sm">クリックして変更</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <svg
              className={`w-10 h-10 mb-3 transition-colors ${
                isDragging ? 'text-brand-gold' : 'text-brand-platinum/50'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-brand-platinum/70 text-center">
              ドラッグ＆ドロップ
              <br />
              またはクリック
            </p>
            <p className="text-xs text-brand-platinum/40 mt-1">JPEG, PNG, WebP (最大10MB)</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileSelect(selectedFile, side);
          }}
        />
      </div>
      {file && (
        <p className="text-xs text-brand-platinum/50 mt-2 truncate">
          {file.name} ({formatBytes(file.size)})
        </p>
      )}
      {renderPresetSelector(side, currentPreset, setPreset)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {renderDropZone('front', '表面（フロント）', frontFile, frontPreview, isDraggingFront, frontInputRef, frontPreset, setFrontPreset)}
        {renderDropZone('back', '裏面（バック）', backFile, backPreview, isDraggingBack, backInputRef, backPreset, setBackPreset)}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl bg-green-500/10 p-4 border border-green-500/20 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-300">{successMessage}</p>
        </div>
      )}

      {uploadResult && (
        <div className="rounded-xl bg-brand-dark-light/30 p-4 border border-white/5 space-y-2">
          <p className="text-sm font-medium text-brand-platinum mb-2">最適化結果:</p>
          {uploadResult.front && (
            <div className="flex items-center justify-between text-xs text-brand-platinum/70">
              <span>表面:</span>
              <span>
                {formatBytes(uploadResult.front.originalSize)} → {formatBytes(uploadResult.front.processedSize)}{' '}
                ({uploadResult.front.dimensions})
              </span>
            </div>
          )}
          {uploadResult.back && (
            <div className="flex items-center justify-between text-xs text-brand-platinum/70">
              <span>裏面:</span>
              <span>
                {formatBytes(uploadResult.back.originalSize)} → {formatBytes(uploadResult.back.processedSize)}{' '}
                ({uploadResult.back.dimensions})
              </span>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="w-full bg-brand-dark-light/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-blue to-brand-gold h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-brand-platinum/50 text-center">処理中... {progress}%</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || (!frontFile && !backFile)}
        className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all ${
          uploading || (!frontFile && !backFile)
            ? 'bg-brand-platinum/10 text-brand-platinum/30 cursor-not-allowed'
            : 'bg-gradient-to-r from-brand-gold to-yellow-500 text-brand-dark hover:scale-[1.02] shadow-lg shadow-brand-gold/20'
        }`}
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
            最適化＆アップロード中...
          </span>
        ) : (
          '画像を最適化してアップロード'
        )}
      </button>
    </div>
  );
}
