'use client';

import { CameraGuideState } from '@/types/authenticity';

interface CameraGuideOverlayProps {
  guideState: CameraGuideState;
  cardType?: 'standard' | 'small';
}

/**
 * CameraGuideOverlay - カメラプレビュー上にカード型ガイド枠を表示するオーバーレイ
 *
 * - カード型ガイド枠を中央に表示（トレーディングカードの縦横比）
 * - 状態に応じて枠の色を変化させる
 * - 枠の外側を暗いオーバーレイで覆う
 * - 枠の角にコーナーマークを描画
 */
export default function CameraGuideOverlay({
  guideState,
  cardType = 'standard',
}: CameraGuideOverlayProps) {
  // ガイド枠の色を状態で決定
  const getBorderColor = (): string => {
    if (guideState.readyToCapture) {
      return '#22C55E'; // 緑 - 撮影可能
    }
    if (
      guideState.brightness === 'ok' &&
      guideState.tilt === 'ok' &&
      guideState.focus === 'ok'
    ) {
      return 'rgba(255, 255, 255, 0.6)'; // 白（半透明）- 問題なし
    }
    return '#EAB308'; // 黄色 - 何らかの問題あり
  };

  // ガイドメッセージを状態で決定
  const getGuideMessage = (): string => {
    if (guideState.readyToCapture) {
      return '撮影できます';
    }
    if (guideState.brightness === 'too_dark') {
      return 'もう少し明るい場所で撮影してください';
    }
    if (guideState.brightness === 'too_bright') {
      return '明るすぎます。光を調整してください';
    }
    if (guideState.tilt === 'tilted') {
      return 'カードに対して真上から撮影してください';
    }
    if (guideState.focus === 'blurry') {
      return 'ピントを合わせてください';
    }
    if (!guideState.cardDetected) {
      return 'カードをガイド枠に合わせてください';
    }
    return 'カードをガイド枠に合わせてください';
  };

  const borderColor = getBorderColor();

  // カードサイズ比率（width / height）
  // standard: 63mm x 88mm, small: 59mm x 86mm
  const aspectRatio = cardType === 'standard' ? 63 / 88 : 59 / 86;

  // ガイド枠サイズ（画面に対する割合）
  const guideHeightPercent = 60; // 画面高さの60%
  const guideWidthPercent = guideHeightPercent * aspectRatio;

  const CORNER_SIZE = 24;
  const CORNER_THICKNESS = 3;

  const cornerStyle = {
    position: 'absolute' as const,
    width: `${CORNER_SIZE}px`,
    height: `${CORNER_SIZE}px`,
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* ガイド枠 + 外側の暗いオーバーレイ */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: `${guideWidthPercent}%`,
            height: `${guideHeightPercent}%`,
            borderRadius: '12px',
            border: `2px solid ${borderColor}`,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5)`,
            transition: 'border-color 0.3s ease',
          }}
        >
          {/* コーナーマーク - 左上 */}
          <div
            style={{
              ...cornerStyle,
              top: '-2px',
              left: '-2px',
              borderTop: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderLeft: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderTopLeftRadius: '12px',
              transition: 'border-color 0.3s ease',
            }}
          />
          {/* コーナーマーク - 右上 */}
          <div
            style={{
              ...cornerStyle,
              top: '-2px',
              right: '-2px',
              borderTop: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderRight: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderTopRightRadius: '12px',
              transition: 'border-color 0.3s ease',
            }}
          />
          {/* コーナーマーク - 左下 */}
          <div
            style={{
              ...cornerStyle,
              bottom: '-2px',
              left: '-2px',
              borderBottom: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderLeft: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderBottomLeftRadius: '12px',
              transition: 'border-color 0.3s ease',
            }}
          />
          {/* コーナーマーク - 右下 */}
          <div
            style={{
              ...cornerStyle,
              bottom: '-2px',
              right: '-2px',
              borderBottom: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderRight: `${CORNER_THICKNESS}px solid ${borderColor}`,
              borderBottomRightRadius: '12px',
              transition: 'border-color 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* ガイドメッセージ */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center">
        <p className="text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
          {getGuideMessage()}
        </p>
      </div>
    </div>
  );
}
